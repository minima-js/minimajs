import chalk from "chalk";

export namespace logger {
  // eslint-disable-next-line no-console
  export const clear = console.clear;

  export function info(...lines: string[]): void {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }

  export function warn(msg: string): void {
    process.stderr.write(`${chalk.yellow(`⚠ ${msg}`)}\n`);
  }

  export function error(msg: string): void {
    process.stderr.write(`${chalk.red("✖")} ${msg}\n`);
  }

  export function fatal(msg: string): never {
    process.stderr.write(`${chalk.red(`✖ ${msg}`)}\n`);
    process.exit(1);
  }

  export function caught(err: unknown): void {
    process.exitCode = 1;
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${chalk.red(`✖ ${msg}`)}\n`);
  }
}
