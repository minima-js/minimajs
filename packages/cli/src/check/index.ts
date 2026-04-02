import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bold, green, red, dim, cyan } from "../utils/colors.js";

const tscBin = fileURLToPath(import.meta.resolve("typescript/bin/tsc"));

export function runCheck(tsconfig = "tsconfig.json"): void {
  process.stdout.write(cyan("type checking...\n"));
  const start = Date.now();

  const result = spawnSync(process.execPath, [tscBin, "--noEmit", "--project", tsconfig], {
    stdio: "inherit",
  });

  const elapsed = dim(`(${Date.now() - start}ms)`);

  if (result.status === 0) {
    process.stdout.write(`\n  ${green("✔")} ${bold("No type errors")} ${elapsed}\n\n`);
  } else {
    process.stderr.write(red(`\nType check failed ${elapsed}\n`));
    process.exit(1);
  }
}
