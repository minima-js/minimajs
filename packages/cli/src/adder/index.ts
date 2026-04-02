import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { bold, cyan, green, dim, yellow } from "../utils/colors.js";
import { write } from "../utils/fs.js";
import { createSpinner } from "../utils/spinner.js";
import * as pm from "../pm/index.js";
import { fileURLToPath } from "node:url";

export interface Integration {
  name: string;
  description: string;
  packages: string[];
  files: Array<{ path: string; content: string }>;
}

export const integrations: Record<string, Integration> = {
  openapi: {
    name: "openapi",
    description: "OpenAPI/Swagger documentation",
    packages: ["@minimajs/openapi"],
    files: [
      {
        path: "src/openapi.ts",
        content: `import { openapi } from "@minimajs/openapi";

export default openapi({
  info: {
    title: "My API",
    version: "1.0.0",
  },
});
`,
      },
    ],
  },
  disk: {
    name: "disk",
    description: "Disk file storage",
    packages: ["@minimajs/disk"],
    files: [
      {
        path: "src/disk.ts",
        content: `import { createDisk } from "@minimajs/disk";

export const disk = createDisk({
  driver: "local",
  root: "./storage",
});
`,
      },
    ],
  },
  cache: {
    name: "cache",
    description: "Cache layer",
    packages: ["@minimajs/cache"],
    files: [
      {
        path: "src/cache.ts",
        content: `import { createCache } from "@minimajs/cache";

export const cache = createCache({
  driver: "memory",
});
`,
      },
    ],
  },
  queue: {
    name: "queue",
    description: "Background job queue",
    packages: ["@minimajs/queue"],
    files: [
      {
        path: "src/queue.ts",
        content: `import { createQueue } from "@minimajs/queue";

export const queue = createQueue({
  driver: "memory",
});
`,
      },
    ],
  },
  mail: {
    name: "mail",
    description: "Email delivery",
    packages: ["@minimajs/mail"],
    files: [
      {
        path: "src/mail.ts",
        content: `import { createMailer } from "@minimajs/mail";

export const mailer = createMailer({
  driver: "smtp",
  host: process.env.MAIL_HOST ?? "localhost",
  port: Number(process.env.MAIL_PORT ?? 1025),
});
`,
      },
    ],
  },
};

const templatesDir = fileURLToPath(new URL("./templates", import.meta.url));

/** Map detected PM to the Dockerfile template filename */
const DOCKERFILE_TEMPLATE: Record<pm.PM, string> = {
  bun: "Dockerfile.bun",
  npm: "Dockerfile.node",
  pnpm: "Dockerfile.pnpm",
  yarn: "Dockerfile.yarn",
};

function readDockerfile(manager: pm.PM, berry: boolean): string {
  const template = manager === "yarn" && berry ? "Dockerfile.berry" : DOCKERFILE_TEMPLATE[manager];
  return readFileSync(join(templatesDir, template), "utf8");
}

export function addDockerfile(): void {
  const detected = pm.detect();
  const berry = detected === "yarn" && pm.isYarnBerry();
  const destPath = join(process.cwd(), "Dockerfile");

  if (existsSync(destPath)) {
    process.stderr.write(`  ${yellow("!")} Dockerfile already exists\n`);
    process.exit(1);
  }

  write(destPath, readDockerfile(detected, berry));

  const label = berry ? "yarn berry" : detected;

  process.stdout.write(
    [
      "",
      `  ${green("✔")} Created ${bold(cyan("Dockerfile"))} for ${bold(label)}`,
      "",
      `  ${dim("Tip:")} build with ${cyan("docker build -t my-app .")}`,
      "",
    ].join("\n")
  );
}

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
    write(fullPath, file.content);
    created.push(file.path);
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
