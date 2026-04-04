import { stderr } from "./logging.js";
import { red } from "./colors.js";

export function handleError(err: unknown): void {
  process.exitCode = 1;
  if (err instanceof Error) {
    stderr(red("✘ " + err.message));
  } else {
    stderr(err);
  }
}
