import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import ms from "pretty-ms";

const tscBin = fileURLToPath(import.meta.resolve("typescript/bin/tsc"));

export function runCheck(tsconfig = "tsconfig.json"): void {
  process.stdout.write(chalk.cyan("type checking...\n"));
  const start = Date.now();

  const result = spawnSync(process.execPath, [tscBin, "--noEmit", "--project", tsconfig], {
    stdio: "inherit",
  });

  const elapsed = chalk.dim(`(${ms(Date.now() - start)})`);

  if (result.status === 0) {
    process.stdout.write(`\n  ${chalk.green("✔")} ${chalk.bold("No type errors")} ${elapsed}\n\n`);
  } else {
    process.stderr.write(chalk.red(`\nType check failed ${elapsed}\n`));
    process.exit(1);
  }
}
