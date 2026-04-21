/**
 * AST-guided source patcher for src/module.ts.
 *
 * Uses the TypeScript Compiler API to locate exact character positions, then
 * performs surgical text splices on the original source.  The printer is never
 * involved, so all original formatting is preserved.
 */

import { join } from "node:path";
import ts from "typescript";
import { exists, text } from "../utils/fs.js";

/**
 * Patch src/module.ts to:
 *  1. Add an import declaration (after the last existing import)
 *  2. Append a plugin expression to the `plugins` array inside `export const meta`
 *     (or create the `plugins` property if it doesn't exist yet)
 *
 * Idempotent: skips if the import is already present.
 */
export function patchModule(cwd: string, importLine: string, plugin: string): void {
  const modulePath = join(cwd, "src", "module.ts");
  if (!exists(modulePath)) return;

  const original = text.sync(modulePath);
  if (original.includes(importLine)) return;

  const src = ts.createSourceFile(modulePath, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  // ── 1. Locate import insertion point ────────────────────────────────────────
  let importInsertPos = 0;
  for (const stmt of src.statements) {
    if (ts.isImportDeclaration(stmt)) importInsertPos = stmt.end;
  }
  const importSplice: Splice =
    importInsertPos === 0 ? { pos: 0, insert: importLine + "\n" } : { pos: importInsertPos, insert: "\n" + importLine };

  // ── 2. Locate plugins array insertion point inside `export const meta` ──────
  const pluginSplice = findPluginSplice(src, original, plugin);

  // ── 3. Apply splices highest-position first so earlier positions stay valid ─
  let result = original;
  const splices = [importSplice, ...(pluginSplice ? [pluginSplice] : [])].sort((a, b) => b.pos - a.pos);
  for (const { pos, insert } of splices) {
    result = result.slice(0, pos) + insert + result.slice(pos);
  }

  text.write.sync(modulePath, result);
}

// ─── Position finders ─────────────────────────────────────────────────────────

type Splice = { pos: number; insert: string };

function findPluginSplice(src: ts.SourceFile, original: string, plugin: string): Splice | null {
  for (const stmt of src.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    if (!stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;

    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== "meta") continue;
      if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) continue;

      return spliceForMetaObject(decl.initializer, original, plugin);
    }
  }
  return null;
}

function spliceForMetaObject(obj: ts.ObjectLiteralExpression, original: string, plugin: string): Splice {
  const pluginsProp = obj.properties.find(
    (p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "plugins"
  ) as ts.PropertyAssignment | undefined;

  if (pluginsProp) {
    // Append to the existing array literal
    if (!ts.isArrayLiteralExpression(pluginsProp.initializer)) {
      return { pos: pluginsProp.end, insert: "" }; // not an array — no-op
    }
    const arr = pluginsProp.initializer;
    const lastEl = arr.elements.at(-1);
    if (!lastEl) {
      return { pos: arr.getStart() + 1, insert: plugin };
    }
    return { pos: lastEl.end, insert: `, ${plugin}` };
  }

  // No plugins property — create one before the closing brace of the meta object.
  // Mirror the indentation of existing properties (or fall back to two spaces).
  const firstProp = obj.properties.at(0);
  const lastProp = obj.properties.at(-1);
  const indent = firstProp ? lineIndent(original, firstProp.getStart()) : "  ";
  const insertAfter = lastProp ? lastProp.end : obj.getStart() + 1;

  return { pos: insertAfter, insert: `,\n${indent}plugins: [${plugin}]` };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return the leading whitespace of the line that contains `pos`. */
function lineIndent(src: string, pos: number): string {
  const lineStart = src.lastIndexOf("\n", pos) + 1;
  return src.slice(lineStart).match(/^(\s*)/)?.[1] ?? "";
}
