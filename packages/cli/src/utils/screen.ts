import { clear, log } from "./logging.js";

export function getResetScreen(): (heading?: string) => void {
  return (heading) => {
    clear();
    if (heading) {
      log(heading);
    }
  };
}
