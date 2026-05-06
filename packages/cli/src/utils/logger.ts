import chalk from "chalk";

/**
 * Lightweight structured logger that writes exclusively to `stderr` so
 * stdout remains clean for machine-readable output.
 *
 * All methods are synchronous and write immediately.
 */
export namespace logger {
  /** Clears the terminal screen. Alias for `console.clear`. */
  // eslint-disable-next-line no-console
  export const clear = console.clear;

  /**
   * Writes one or more plain-text lines to stderr, each followed by a newline.
   * Use this for neutral informational output that requires no visual emphasis.
   */
  export function info(...lines: string[]): void {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }

  /** Writes a yellow `⚠` warning message to stderr. */
  export function warn(msg: string): void {
    process.stderr.write(`${chalk.yellow(`⚠ ${msg}`)}\n`);
  }

  /** Writes a red `✖` error message to stderr without exiting. */
  export function error(msg: string): void {
    process.stderr.write(`${chalk.red("✖")} ${msg}\n`);
  }

  /**
   * Writes a red `✖` error message to stderr and immediately exits the
   * process with code `1`. This function never returns.
   */
  export function fatal(msg: string): never {
    process.stderr.write(`${chalk.red(`✖ ${msg}`)}\n`);
    process.exit(1);
  }

  /**
   * Sets `process.exitCode = 1` and writes the error message to stderr.
   *
   * Unlike {@link fatal} this does not call `process.exit`, so any cleanup
   * handlers and pending async work will still run before the process ends.
   * Accepts any thrown value — non-`Error` values are coerced via `String()`.
   */
  export function caught(err: unknown): void {
    process.exitCode = 1;
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${chalk.red(`✖ ${msg}`)}\n`);
  }
}
