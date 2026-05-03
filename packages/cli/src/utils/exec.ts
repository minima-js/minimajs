import { spawnSync, spawn } from "node:child_process";
import type { StdioOptions } from "node:child_process";

/** Options passed to any `exec` variant. All fields are optional. */
export interface ExecOptions {
  /** Working directory for the child process. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Extra environment variables merged on top of `process.env`. */
  env?: Record<string, string>;
  /**
   * stdio configuration forwarded to Node's `spawn`/`spawnSync`.
   * Defaults to `"inherit"` (output printed to the terminal).
   * Use `["ignore", "pipe", "pipe"]` to capture output silently.
   */
  stdio?: StdioOptions;
}

/** Trimmed output returned by every `exec` variant on success. */
export interface ExecResult {
  /** Trimmed stdout of the process, or `""` when stdio is `"inherit"`. */
  stdout: string;
  /** Trimmed stderr of the process, or `""` when stdio is `"inherit"`. */
  stderr: string;
  /** Exit code reported by the process. */
  exitCode: number;
}

/**
 * Thrown by `exec`, `exec.sync`, `exec.capture`, and `exec.capture.sync`
 * when the child process exits with a non-zero code.
 *
 * The error message includes the full command string and, when available,
 * the trimmed stderr output.
 */
export class ExecError extends Error {
  constructor(
    /** The command that was run, formatted as `"file arg1 arg2 …"`. */
    readonly command: string,
    /** The non-zero exit code returned by the process. */
    readonly exitCode: number,
    /** Trimmed stdout at the time the process exited. */
    readonly stdout: string,
    /** Trimmed stderr at the time the process exited. */
    readonly stderr: string
  ) {
    super(`\`${command}\` exited with code ${exitCode}${stderr ? `\n${stderr}` : ""}`);
    this.name = "ExecError";
  }
}

/**
 * Spawns a process asynchronously and resolves with its output.
 *
 * Default `stdio` is `"inherit"`: output is printed to the terminal and
 * `stdout`/`stderr` in the result will be empty strings.
 * Rejects with {@link ExecError} on non-zero exit, or with the underlying
 * spawn `Error` if the executable could not be started.
 *
 * **Sub-methods** (callable namespace):
 * - `exec.sync`          — synchronous variant, blocks until the process exits
 * - `exec.capture`       — async variant that forces `stdio: pipe` and captures output
 * - `exec.capture.sync`  — synchronous capture variant
 * - `exec.safe`          — async variant that never throws; returns an `ok` boolean
 * - `exec.safe.sync`     — synchronous safe variant
 */
export async function exec(file: string, args: string[] = [], options: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd: options.cwd ?? process.cwd(),
      stdio: options.stdio ?? "inherit",
      env: { ...process.env, ...options.env },
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      const out = Buffer.concat(stdout).toString("utf8").trim();
      const err = Buffer.concat(stderr).toString("utf8").trim();
      const exitCode = code ?? 1;
      const command = [file, ...args].join(" ");

      if (exitCode !== 0) {
        reject(new ExecError(command, exitCode, out, err));
      } else {
        resolve({ stdout: out, stderr: err, exitCode });
      }
    });
  });
}

export namespace exec {
  /**
   * Synchronous variant of {@link exec}. Blocks the event loop until the
   * process exits.
   *
   * Default `stdio` is `"inherit"`.
   * Throws {@link ExecError} on non-zero exit code, or the underlying spawn
   * `Error` if the process could not be started.
   */
  export function sync(file: string, args: string[] = [], options: ExecOptions = {}): ExecResult {
    const result = spawnSync(file, args, {
      cwd: options.cwd ?? process.cwd(),
      stdio: options.stdio ?? "inherit",
      env: { ...process.env, ...options.env },
      encoding: "buffer",
    });

    const stdout = result.stdout?.toString("utf8").trim() ?? "";
    const stderr = result.stderr?.toString("utf8").trim() ?? "";
    const exitCode = result.status ?? 1;
    const command = [file, ...args].join(" ");

    if (result.error) throw Object.assign(result.error, { command });
    if (exitCode !== 0) throw new ExecError(command, exitCode, stdout, stderr);

    return { stdout, stderr, exitCode };
  }

  /**
   * Async variant of {@link exec} that always captures output.
   *
   * Forces `stdio: ["ignore", "pipe", "pipe"]` regardless of the `stdio`
   * option, so output is never printed to the terminal. The captured text
   * is available on the resolved {@link ExecResult}.
   * Throws {@link ExecError} on non-zero exit code.
   */
  export function capture(file: string, args: string[] = [], options: ExecOptions = {}): Promise<ExecResult> {
    return exec(file, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  }

  export namespace capture {
    /**
     * Synchronous variant of {@link exec.capture}. Blocks until the process
     * exits and returns the captured output.
     *
     * Forces `stdio: ["ignore", "pipe", "pipe"]`.
     * Throws {@link ExecError} on non-zero exit code.
     */
    export function sync(file: string, args: string[] = [], options: ExecOptions = {}): ExecResult {
      return exec.sync(file, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    }
  }

  /**
   * Async variant of {@link exec} that never throws on non-zero exit codes.
   *
   * Returns the standard {@link ExecResult} extended with `ok: boolean`.
   * `ok` is `true` when the process exited with code `0`, and `false`
   * otherwise — `stdout`, `stderr`, and `exitCode` still reflect what the
   * process produced. Only rethrows errors that are **not** {@link ExecError}
   * (e.g. spawn failures where the executable was not found).
   */
  export async function safe(
    file: string,
    args: string[] = [],
    options: ExecOptions = {}
  ): Promise<ExecResult & { ok: boolean }> {
    try {
      return { ...(await exec(file, args, options)), ok: true };
    } catch (e) {
      if (e instanceof ExecError) {
        return { stdout: e.stdout, stderr: e.stderr, exitCode: e.exitCode, ok: false };
      }
      throw e;
    }
  }

  export namespace safe {
    /**
     * Synchronous variant of {@link exec.safe}. Blocks until the process exits.
     *
     * Returns `ok: true` on exit code `0`, `ok: false` on any non-zero code.
     * Only rethrows errors that are **not** {@link ExecError}.
     */
    export function sync(file: string, args: string[] = [], options: ExecOptions = {}): ExecResult & { ok: boolean } {
      try {
        return { ...exec.sync(file, args, options), ok: true };
      } catch (e) {
        if (e instanceof ExecError) {
          return { stdout: e.stdout, stderr: e.stderr, exitCode: e.exitCode, ok: false };
        }
        throw e;
      }
    }
  }
}
