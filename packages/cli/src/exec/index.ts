import { spawnSync, spawn } from "node:child_process";
import type { StdioOptions } from "node:child_process";

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdio?: StdioOptions;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class ExecError extends Error {
  constructor(
    readonly command: string,
    readonly exitCode: number,
    readonly stdout: string,
    readonly stderr: string
  ) {
    super(`\`${command}\` exited with code ${exitCode}${stderr ? `\n${stderr}` : ""}`);
    this.name = "ExecError";
  }
}

/**
 * Synchronously spawns a process and returns its output.
 * Throws `ExecError` on non-zero exit code. Default `stdio` is `"inherit"`.
 */
function execSync(file: string, args: string[] = [], options: ExecOptions = {}): ExecResult {
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
 * Asynchronously spawns a process and resolves with its output.
 * Throws `ExecError` on non-zero exit code. Default `stdio` is `"inherit"`.
 *
 * Sub-methods:
 * - `exec.capture` — captures stdout/stderr instead of printing them
 * - `exec.safe`    — never throws on non-zero exit; returns `ok` boolean
 * - `exec.sync`    — synchronous variant with the same sub-methods
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

/**
 * Asynchronously spawns a process and captures its stdout/stderr.
 * Forces `stdio: pipe` — output is not printed to the terminal.
 * Throws `ExecError` on non-zero exit code.
 */
function capture(file: string, args: string[] = [], options: ExecOptions = {}): Promise<ExecResult> {
  return exec(file, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
}
capture.sync = function captureSync(file: string, args: string[] = [], options: ExecOptions = {}): ExecResult {
  return execSync(file, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
};

async function safe(file: string, args: string[] = [], options: ExecOptions = {}): Promise<ExecResult & { ok: boolean }> {
  try {
    return { ...(await exec(file, args, options)), ok: true };
  } catch (e) {
    if (e instanceof ExecError) {
      return { stdout: e.stdout, stderr: e.stderr, exitCode: e.exitCode, ok: false };
    }
    throw e;
  }
}
safe.sync = function safeSync(file: string, args: string[] = [], options: ExecOptions = {}): ExecResult & { ok: boolean } {
  try {
    return { ...execSync(file, args, options), ok: true };
  } catch (e) {
    if (e instanceof ExecError) {
      return { stdout: e.stdout, stderr: e.stderr, exitCode: e.exitCode, ok: false };
    }
    throw e;
  }
};

exec.capture = capture;
exec.safe = safe;
exec.sync = execSync;
