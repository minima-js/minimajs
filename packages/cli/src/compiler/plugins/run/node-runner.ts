import { spawn, type ChildProcess } from "node:child_process";

export function runProcess(
  bin: string,
  args: string[],
  envVars?: Record<string, string>
): (signal?: NodeJS.Signals) => Promise<void> {
  let isStopping = false;
  let proc: ChildProcess;

  const env = envVars ? { ...process.env, ...envVars } : process.env;

  const promise = new Promise<void>((resolve) => {
    proc = spawn(bin, args, { stdio: "inherit", env });
    proc.on("exit", () => resolve());
    proc.on("error", () => resolve());
  });

  function stop(signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
    if (isStopping) return promise;
    isStopping = true;
    proc?.kill(signal);
    return promise;
  }

  return stop;
}
