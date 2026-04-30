import { defineCommand } from "citty";
import chalk from "chalk";
import { exists, text } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { templates } from "../templates/index.js";
import { runtime } from "#/runtime/index.js";
import * as pm from "#/pm/index.js";
import { loadConfig } from "#/config/index.js";

async function fetchDockerVersion(repo: string, fallback: string): Promise<string> {
  try {
    const path = repo.includes("/") ? repo : `library/${repo}`;
    const res = await fetch(
      `https://hub.docker.com/v2/repositories/${path}/tags?page_size=10&name=alpine&ordering=-last_updated`
    );
    const body = (await res.json()) as { results: Array<{ name: string }> };
    const pattern = /^(\d+\.\d+\.\d+)-alpine$/;
    const found = body.results
      .filter((t) => pattern.test(t.name))
      .sort((a, b) => {
        const av = a.name.replace("-alpine", "").split(".").map(Number) as [number, number, number];
        const bv = b.name.replace("-alpine", "").split(".").map(Number) as [number, number, number];
        for (let i = 0; i < 3; i++) if (av[i] !== bv[i]) return bv[i]! - av[i]!;
        return 0;
      });
    return found[0]?.name ?? fallback;
  } catch {
    logger.warn(`Could not fetch latest Docker version for ${repo}, using "${fallback}"`);
    return fallback;
  }
}

interface DockerfileArgs {
  user: string;
  version?: string;
}

async function handle({ args }: { args: DockerfileArgs }) {
  const config = await loadConfig({ mode: "start" });
  const detected = pm.detect();
  const berry = detected === "yarn" && pm.isYarnBerry();
  const destPath = "Dockerfile";

  if (exists(destPath)) {
    logger.fatal("Dockerfile already exists");
  }

  const rt = runtime.detect();
  const repo = rt === "bun" ? "oven/bun" : "node";
  const fallback = rt === "bun" ? "latest" : "lts-alpine";
  const detectedVersion = runtime.detect.version();
  const version = args.version ?? (detectedVersion ? `${detectedVersion}-alpine` : await fetchDockerVersion(repo, fallback));

  const cmd =
    rt === "node" && config.sourcemap
      ? `["node", "--enable-source-maps", "dist/index.js"]`
      : rt === "bun"
        ? `["bun", "run", "dist/index.js"]`
        : `["node", "dist/index.js"]`;
  const templateVars = { version, cmd, user: args.user };
  const content = berry ? templates.docker.berry(templateVars) : templates.docker[detected](templateVars);
  text.write.sync(destPath, content);

  const label = berry ? "yarn berry" : detected;
  logger.info(
    "",
    `  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan("Dockerfile"))} for ${chalk.bold(label)}`,
    `  ${chalk.dim("Version:")} ${chalk.cyan(version)}`,
    `  ${chalk.dim("User:")} ${chalk.cyan(args.user)}`,
    "",
    `  ${chalk.dim("Tip:")} build with ${chalk.cyan("docker build -t my-app .")}`,
    ""
  );
}

export const dockerfile = defineCommand({
  meta: { name: "dockerfile", description: "Generate a Dockerfile (auto-detects bun or node runtime)" },
  args: {
    user: {
      type: "string",
      description: "Non-root user to run the container as",
      default: "minimajs",
    },
    version: {
      type: "string",
      description: "Base image version tag (e.g. 24-alpine, lts-alpine)",
    },
  },
  run: handle,
});
