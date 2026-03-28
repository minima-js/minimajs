export function moduleTs(name: string): string {
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  return `import type { Meta, Routes } from "@minimajs/server";

export const meta: Meta = {
  plugins: [],
};

export const routes: Routes = {
  "GET /": list${title},
};

async function list${title}() {
  return { data: [] };
}
`;
}
