export interface PackageJson {
  name: string;
  version: string;
  type: "module" | "commonjs";
  private?: boolean;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  [key: string]: unknown;
}
