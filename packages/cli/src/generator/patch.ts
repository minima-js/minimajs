import { join } from "node:path";
import { parseModule, generateCode, builders } from "magicast";
import { exists, text } from "../utils/fs.js";

export interface PatchSpec {
  from: string;
  imported: string;
  plugin: string;
}

export interface PatchSuggestion {
  modulePath: string;
  before: string;
  after: string;
  spec: PatchSpec;
}

function resolveModulePath(cwd: string): string {
  return join(cwd, "src", "module.ts");
}

function buildPatch(source: string, spec: PatchSpec): string {
  const mod = parseModule(source);

  const alreadyImported = mod.imports.$items.some((i) => i.from === spec.from && i.imported === spec.imported);
  if (alreadyImported) return source;

  mod.imports.$prepend({ from: spec.from, imported: spec.imported });

  const meta = mod.exports.meta as any;
  if (meta) {
    if (!meta.plugins) {
      meta.plugins = [builders.raw(spec.plugin)];
    } else {
      meta.plugins.push(builders.raw(spec.plugin));
    }
  }

  return generateCode(mod).code;
}

/**
 * Return what applying spec would produce without touching the file.
 * Returns null when the patch is already applied (idempotent / no-op).
 * Pass `modulePath` to target a module other than `src/module.ts`.
 */
export function suggestModule(cwd: string, spec: PatchSpec, modulePath?: string): PatchSuggestion | null {
  const resolvedPath = modulePath ?? resolveModulePath(cwd);
  if (!exists(resolvedPath)) return null;

  const original = text.sync(resolvedPath);
  const after = buildPatch(original, spec);
  if (after === original) return null;

  return { modulePath: resolvedPath, before: original, after, spec };
}

/**
 * Write a previously computed suggestion to disk.
 */
export function applyPatch(suggestion: PatchSuggestion): void {
  text.write.sync(suggestion.modulePath, suggestion.after);
}

function buildIndexPatch(source: string, spec: PatchSpec): string {
  const mod = parseModule(source);

  const alreadyImported = mod.imports.$items.some((i) => i.from === spec.from && i.imported === spec.imported);
  if (alreadyImported) return source;

  mod.imports.$prepend({ from: spec.from, imported: spec.imported });

  let code = generateCode(mod).code;
  code = code.replace(/^(const app = createApp\([^)]*\);)$/m, `$1\napp.register(${spec.plugin});`);
  return code;
}

/**
 * Patch src/index.ts by adding an import and registering via app.register().
 * Returns null when already applied or index.ts doesn't exist.
 */
export function suggestIndex(cwd: string, spec: PatchSpec): PatchSuggestion | null {
  const indexPath = join(cwd, "src", "index.ts");
  if (!exists(indexPath)) return null;

  const original = text.sync(indexPath);
  const after = buildIndexPatch(original, spec);
  if (after === original) return null;

  return { modulePath: indexPath, before: original, after, spec };
}
