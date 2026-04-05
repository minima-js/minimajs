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

function fatal(msg: string): void {
  process.stderr.write(`${chalk.red(`✖ ${msg}`)}\n`);
}

function caught(err: unknown): void {
  process.exitCode = 1;
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${chalk.red(`✖ ${msg}`)}\n`);
}

function clear(): void {
  // eslint-disable-next-line no-console
  console.clear();
}

export const logger = { info, warn, error, fatal, catch: caught, clear };
