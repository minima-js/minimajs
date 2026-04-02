/**
 * TypeScript type checker using the TS compiler API directly in a worker thread.
 *
 * How it works (similar to fork-ts-checker):
 *  - On one-shot build: runs in a worker_thread in parallel with esbuild so
 *    both type-checking and bundling happen at the same time.
 *  - On watch: uses ts.createWatchProgram() inside the worker so incremental
 *    re-checks are fast (no cold-start on every file change).
 *  - Uses ts.createIncrementalProgram() for one-shot builds to reuse
 *    .tsbuildinfo across runs, just like tsc --incremental.
 *  - Diagnostics are sent back over the worker MessagePort as structured
 *    objects and formatted in the main thread.
 */

import type ts from "typescript";
import { workerData, parentPort, isMainThread } from "node:worker_threads";

export interface TsDiagnostic {
  file?: string;
  line?: number;
  col?: number;
  message: string;
  code: number;
  category: "error" | "warning" | "message" | "suggestion";
}

export type WorkerMessage =
  | { type: "diagnostic"; payload: TsDiagnostic }
  | { type: "done"; errorCount: number }
  | { type: "watch-error"; payload: TsDiagnostic }
  | { type: "watch-clear" };

export interface WorkerData {
  tsconfig: string;
  watch: boolean;
}

// ─── Worker entry (runs in the worker thread) ────────────────────────────────

if (!isMainThread) {
  const typescript: typeof ts = await import("typescript").then((m) => m.default ?? m);
  const { tsconfig, watch } = workerData as WorkerData;

  function categoryName(cat: ts.DiagnosticCategory): TsDiagnostic["category"] {
    switch (cat) {
      case typescript.DiagnosticCategory.Error:
        return "error";
      case typescript.DiagnosticCategory.Warning:
        return "warning";
      case typescript.DiagnosticCategory.Suggestion:
        return "suggestion";
      default:
        return "message";
    }
  }

  function toDiagnostic(d: ts.Diagnostic): TsDiagnostic {
    const message = typescript.flattenDiagnosticMessageText(d.messageText, "\n");
    if (d.file && d.start !== undefined) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
      return {
        file: d.file.fileName,
        line: line + 1,
        col: character + 1,
        message,
        code: d.code,
        category: categoryName(d.category),
      };
    }
    return { message, code: d.code, category: categoryName(d.category) };
  }

  function send(msg: WorkerMessage): void {
    parentPort!.postMessage(msg);
  }

  const configPath = typescript.findConfigFile(process.cwd(), typescript.sys.fileExists, tsconfig);
  if (!configPath) throw new Error(`Cannot find tsconfig: ${tsconfig}`);

  if (watch) {
    // ── Watch mode: ts.createWatchProgram stays alive, sends diagnostics as they arrive

    const watchHost = typescript.createWatchCompilerHost(
      configPath,
      { noEmit: true },
      typescript.sys,
      typescript.createSemanticDiagnosticsBuilderProgram,
      (d) => send({ type: "watch-error", payload: toDiagnostic(d) }),
      () => send({ type: "watch-clear" })
    );

    typescript.createWatchProgram(watchHost);
  }
}
