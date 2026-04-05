import { logger } from "./logger.js";

export function getResetScreen(): (heading?: string) => void {
  return (heading) => {
    logger.clear();
    if (heading) {
      logger.info(heading);
    }
  };
}
