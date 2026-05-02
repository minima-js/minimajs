export interface WorkdirOption {
  cwd?: string;
}

export type Stub<T extends Record<string, string | number> | never = never> = [T] extends [never]
  ? () => string
  : (vars: T) => string;
