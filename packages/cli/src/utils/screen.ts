import { logger } from "./logger.js";

/**
 * Returns a function that clears the terminal and optionally prints a heading.
 *
 * The returned function is typically called at the start of each interactive
 * render cycle to produce a clean full-screen UI. When `heading` is provided
 * it is written to stderr via {@link logger.info} immediately after the clear.
 */
export function getResetScreen(): (heading?: string) => void {
  return (heading) => {
    logger.clear();
    if (heading) {
      logger.info(heading);
    }
  };
}
