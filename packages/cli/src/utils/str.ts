export function toPascal(name: string): string {
  const base = name.split("/").at(-1) ?? name;
  return base.replace(/-([a-z])/g, (_, c: string) => (c as string).toUpperCase()).replace(/^./, (c) => c.toUpperCase());
}
export function toCamel(name: string): string {
  const base = name.split("/").at(-1) ?? name;
  return base.replace(/-([a-z])/g, (_, c: string) => (c as string).toUpperCase());
}
