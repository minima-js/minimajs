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

  const alreadyImported = mod.imports.$items.some(
    (i) => i.from === spec.from && i.imported === spec.imported
  );
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
 */
export function suggestModule(cwd: string, spec: PatchSpec): PatchSuggestion | null {
  const modulePath = resolveModulePath(cwd);
  if (!exists(modulePath)) return null;

  const original = text.sync(modulePath);
  const after = buildPatch(original, spec);
  if (after === original) return null;

  return { modulePath, before: original, after, spec };
}

/**
 * Write a previously computed suggestion to disk.
 */
export function applyPatch(suggestion: PatchSuggestion): void {
  text.write.sync(suggestion.modulePath, suggestion.after);
}
