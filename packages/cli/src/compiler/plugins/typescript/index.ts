import type { Plugin } from "esbuild";
import { startWatchTypeChecker } from "./checker.js";
import { formatDiagnostic } from "./checker.js";

export function tsCheckPlugin(tsconfig: string): Plugin {
  return {
    name: "ts-check",
    setup(build) {
      let stop: (() => void) | undefined;
      build.onStart(() => {
        stop?.();
        stop = startWatchTypeChecker(tsconfig, {
          onClear() {
            // tsc cleared — new check cycle starting, nothing to show yet
          },
          onDiagnostic(d) {
            process.stderr.write(formatDiagnostic(d) + "\n");
          },
        });
      });
      build.onDispose(() => stop?.());
    },
  };
}
