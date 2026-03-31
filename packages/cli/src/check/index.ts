import { runTypeCheck } from "../plugins/typescript/checker.js";
import { bold, green, red, dim } from "../utils/colors.js";
import { createSpinner } from "../utils/spinner.js";

export async function runCheck(tsconfig = "tsconfig.json"): Promise<void> {
  const spinner = createSpinner();
  spinner.start("Type checking...");

  const start = Date.now();
  let errorCount = 0;

  try {
    errorCount = await runTypeCheck(tsconfig);
  } catch (err) {
    spinner.fail("Type checker failed to start");
    if (err instanceof Error) process.stderr.write(red(err.message) + "\n");
    process.exit(1);
  }

  const elapsed = dim(`(${Date.now() - start}ms)`);

  if (errorCount === 0) {
    spinner.succeed(`No type errors found ${elapsed}`);
    process.stdout.write(`\n  ${green("✔")} ${bold("All good!")}\n\n`);
  } else {
    spinner.fail(`Found ${bold(String(errorCount))} type error(s) ${elapsed}`);
    process.exit(1);
  }
}
