import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import type { WorkerMessage, TsDiagnostic } from "./worker.js";
import { red, yellow, bold, dim, cyan } from "../../utils/colors.js";

// Only used from main thread
if (!isMainThread) throw new Error("checker must be imported from main thread");

const workerPath = fileURLToPath(new URL("./worker.js", import.meta.url));

export function formatDiagnostic(d: TsDiagnostic): string {
  const loc = d.file
    ? `${cyan(d.file)}${d.line !== undefined ? `:${bold(String(d.line))}:${bold(String(d.col))}` : ""}`
    : "";
  const prefix = d.category === "error" ? red("error") : d.category === "warning" ? yellow("warn") : dim("info");
  const code = dim(`TS${d.code}`);
  return `${prefix} ${code}${loc ? `  ${loc}` : ""}  ${d.message}`;
}

// ─── One-shot: run type check in parallel, returns a promise ────────────────

export function runTypeCheck(tsconfig: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: { tsconfig, watch: false },
    });

    worker.on("message", (msg: WorkerMessage) => {
      if (msg.type === "diagnostic") {
        process.stderr.write(formatDiagnostic(msg.payload) + "\n");
      } else if (msg.type === "done") {
        resolve(msg.errorCount);
      }
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Type checker worker exited with code ${code}`));
    });
  });
}

// ─── Watch: persistent worker, calls back on each diagnostic wave ───────────

export interface WatchTypeCheckerCallbacks {
  onClear(): void;
  onDiagnostic(d: TsDiagnostic): void;
}

export function startWatchTypeChecker(tsconfig: string, cb: WatchTypeCheckerCallbacks): () => void {
  const worker = new Worker(workerPath, {
    workerData: { tsconfig, watch: true },
  });

  worker.on("message", (msg: WorkerMessage) => {
    if (msg.type === "watch-clear") {
      cb.onClear();
    } else if (msg.type === "watch-error") {
      cb.onDiagnostic(msg.payload);
    }
  });

  worker.on("error", (err) => process.stderr.write(red(`Type checker error: ${err.message}\n`)));

  return () => {
    worker.terminate();
  };
}
