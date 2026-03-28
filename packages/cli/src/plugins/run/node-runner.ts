import { ExecaError, execaNode, type ResultPromise } from "execa";

export function runNode(
  filename: string,
  nodeOptions: string[],
  envVars?: Record<string, string>
): (signal?: NodeJS.Signals) => Promise<void> {
  let isStopping = false;
  let proc: ResultPromise;

  async function waitForCompletion(): Promise<void> {
    const env = envVars ? { ...process.env, ...envVars } : process.env;
    proc = execaNode(filename, { nodeOptions, stdio: "inherit", env });
    await proc.catch((err) => {
      if (!(err instanceof ExecaError)) {
        throw err;
      }
    });
  }

  const promise = waitForCompletion();

  function stop(signal?: NodeJS.Signals): Promise<void> {
    if (isStopping) {
      return promise;
    }
    isStopping = true;
    proc.kill(signal);
    return promise;
  }

  return stop;
}
