export function toPascal(name: string): string {
  const base = name.split("/").at(-1) ?? name;
  return base.replace(/-([a-z])/g, (_, c: string) => (c as string).toUpperCase()).replace(/^./, (c) => c.toUpperCase());
}
export function toCamel(name: string): string {
  const base = name.split("/").at(-1) ?? name;
  return base.replace(/-([a-z])/g, (_, c: string) => (c as string).toUpperCase());
}

export function ensureCase<T extends Record<string, unknown>>(data: T, ...args: (keyof T)[]): T {
  for (const name of args) {
    const value = data[name];
    if (!value) continue;
    if (typeof value === "string") {
      data[name] = value.toLowerCase() as T[keyof T];
    }
  }
  return data;
}
