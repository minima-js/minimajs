import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import ms from "pretty-ms";
import { logger } from "../utils/logger.js";

const tscBin = fileURLToPath(import.meta.resolve("typescript/bin/tsc"));

export function runCheck(tsconfig = "tsconfig.json"): void {
  logger.info(chalk.cyan("type checking..."));
  const start = Date.now();

  const result = spawnSync(process.execPath, [tscBin, "--noEmit", "--project", tsconfig], {
    stdio: "inherit",
  });

  const elapsed = chalk.dim(`(${ms(Date.now() - start)})`);

  if (result.status === 0) {
    logger.info("", `  ${chalk.green("✔")} ${chalk.bold("No type errors")} ${elapsed}`, "");
  } else {
    logger.fatal(`Type check failed ${elapsed}`);
  }
}
