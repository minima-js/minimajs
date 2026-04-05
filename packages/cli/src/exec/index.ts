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

execSync.capture = function (file: string, args: string[] = [], options: ExecOptions = {}): ExecResult {
  return execSync(file, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
};

execSync.safe = function (file: string, args: string[] = [], options: ExecOptions = {}): ExecResult & { ok: boolean } {
  try {
    return { ...execSync(file, args, options), ok: true };
  } catch (e) {
    if (e instanceof ExecError) {
      return { stdout: e.stdout, stderr: e.stderr, exitCode: e.exitCode, ok: false };
    }
    throw e;
  }
};

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

exec.capture = function (file: string, args: string[] = [], options: ExecOptions = {}): Promise<ExecResult> {
  return exec(file, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
};

exec.safe = async function execSafe(
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
};

exec.sync = execSync;
