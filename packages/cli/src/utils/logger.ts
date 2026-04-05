import chalk from "chalk";

function info(...lines: string[]): void {
  for (const line of lines) {
    process.stderr.write(`${line}\n`);
  }
}

function warn(msg: string): void {
  process.stderr.write(`${chalk.yellow(`⚠ ${msg}`)}\n`);
}

function error(msg: string): void {
  process.stderr.write(`${chalk.red("✖")} ${msg}\n`);
}

function fatal(msg: string): never {
  process.stderr.write(`${chalk.red(`✖ ${msg}`)}\n`);
  process.exit(1);
}

function caught(err: unknown): void {
  process.exitCode = 1;
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${chalk.red(`✖ ${msg}`)}\n`);
}

// eslint-disable-next-line no-console
export const logger = { info, warn, error, fatal, catch: caught, clear: console.clear };
