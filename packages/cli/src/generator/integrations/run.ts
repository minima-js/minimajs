import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { bold, cyan, green, dim, yellow } from "../../utils/colors.js";
import { text } from "../../utils/fs.js";
import { createSpinner } from "../../utils/spinner.js";
import * as pm from "../../pm/index.js";
import { patchModule } from "../patch.js";
import { integrations } from "./index.js";

export function addIntegration(name: string, _opts: { description?: string } = {}): void {
  const integration = integrations[name];
  if (!integration) {
    const available = Object.keys(integrations).join(", ");
    process.stderr.write(`  Unknown integration: ${bold(name)}\n  Available: ${cyan(available)}\n`);
    process.exit(1);
  }

  const spinner = createSpinner();
  const pkgs = integration.packages.join(" ");

  spinner.start(`Installing ${bold(pkgs)}...`);
  try {
    pm.add(integration.packages);
    spinner.succeed(`Installed ${bold(pkgs)}`);
  } catch {
    spinner.fail(`Install failed — run ${bold(`${pm.detect()} add ${pkgs}`)} manually`);
  }

  const created: string[] = [];
  for (const file of integration.files) {
    const fullPath = join(process.cwd(), file.path);
    if (existsSync(fullPath)) {
      process.stdout.write(`  ${yellow("!")} Skipped ${cyan(file.path)} (already exists)\n`);
      continue;
    }
    mkdirSync(dirname(fullPath), { recursive: true });
    text.write(fullPath, file.content);
    created.push(file.path);
  }

  if (integration.modulePatch) {
    patchModule(process.cwd(), integration.modulePatch.importLine, integration.modulePatch.plugin);
  }

  process.stdout.write(
    [
      "",
      `  ${green("✔")} Added ${bold(cyan(name))} — ${integration.description}`,
      "",
      ...(created.length > 0 ? [`  ${dim("Created:")}`, ...created.map((f) => `    ${cyan(f)}`)] : []),
      "",
    ].join("\n")
  );
}
