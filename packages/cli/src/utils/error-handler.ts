import { stderr } from "./logging.js";
import { red } from "./colors.js";

export function handleError(err: unknown): void {
  if (err instanceof Error) {
    stderr(red("✘ " + err.message));
  } else {
    stderr(err);
  }
}
