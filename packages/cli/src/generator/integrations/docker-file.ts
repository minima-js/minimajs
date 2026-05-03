import { defineCommand } from "citty";
import chalk from "chalk";
import { exists, text } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { templates } from "../templates/index.js";
import { runtime } from "#/runtime/index.js";
import { pkgm } from "#/pkgm/index.js";

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
  port: string;
  force: boolean;
}

async function handle({ args }: { args: DockerfileArgs }) {
  const detected = pkgm();
  const berry = detected === "yarn" && pkgm.isYarnBerry();
  const destPath = "Dockerfile";

  if (exists(destPath) && !args.force) {
    logger.fatal("Dockerfile already exists (use --force to overwrite)");
  }

  const rt = runtime.detect();
  const repo = rt === "bun" ? "oven/bun" : "node";
  const fallback = rt === "bun" ? "latest" : "lts-alpine";
  const detectedVersion = runtime.detect.version();
  const version = args.version ?? (detectedVersion ? `${detectedVersion}-alpine` : await fetchDockerVersion(repo, fallback));

  const isAlpine = version.includes("alpine");
  const userCreate = isAlpine
    ? `addgroup --system ${args.user} && adduser --system --ingroup ${args.user} ${args.user}`
    : `groupadd --system ${args.user} && useradd --system --gid ${args.user} --no-create-home ${args.user}`;

  const templateVars = { version, user: args.user, port: args.port, userCreate };
  const content = berry ? templates.docker.berry(templateVars) : templates.docker[detected](templateVars);
  text.write.sync(destPath, content);

  const dockerignoreCreated = !exists(".dockerignore");
  if (dockerignoreCreated) text.write.sync(".dockerignore", templates.docker.ignore());

  const label = berry ? "yarn berry" : detected;
  logger.info(
    "",
    `  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan("Dockerfile"))} for ${chalk.bold(label)}`,
    ...(dockerignoreCreated ? [`  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan(".dockerignore"))}`] : []),
    `  ${chalk.dim("Version:")} ${chalk.cyan(version)}`,
    `  ${chalk.dim("User:")}    ${chalk.cyan(args.user)}`,
    `  ${chalk.dim("Port:")}    ${chalk.cyan(args.port)}`,
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
    port: {
      type: "string",
      description: "Port the container listens on",
      default: "6464",
    },
    force: {
      type: "boolean",
      description: "Overwrite existing Dockerfile",
      default: false,
    },
  },
  run: handle,
});
