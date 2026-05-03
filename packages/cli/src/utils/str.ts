/**
 * Converts a kebab-case name to PascalCase.
 * When the name contains `/` (e.g. a scoped package), only the last segment
 * is used — `"@scope/my-pkg"` → `"MyPkg"`.
 */
export function toPascal(name: string): string {
  const base = name.split("/").at(-1) ?? name;
  return base.replace(/-([a-z])/g, (_, c: string) => (c as string).toUpperCase()).replace(/^./, (c) => c.toUpperCase());
}

/**
 * Converts a kebab-case name to camelCase.
 * When the name contains `/`, only the last segment is used — same
 * stripping behaviour as {@link toPascal} but the first character stays lowercase.
 */
export function toCamel(name: string): string {
  const base = name.split("/").at(-1) ?? name;
  return base.replace(/-([a-z])/g, (_, c: string) => (c as string).toUpperCase());
}

/**
 * Lower-cases the values of the specified keys in `data` in place.
 *
 * Only string values are modified; missing or non-string fields are skipped.
 * Returns `data` so calls can be chained.
 */
export function ensureCase<T extends object>(data: T, ...args: (keyof T)[]): T {
  for (const name of args) {
    const value = data[name];
    if (!value) continue;
    if (typeof value === "string") {
      data[name] = value.toLowerCase() as T[keyof T];
    }
  }
  return data;
}
