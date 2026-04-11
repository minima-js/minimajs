import { defineCommand } from "citty";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import chalk from "chalk";
import { exists, text } from "#/utils/fs.js";
import { withSpinner } from "#/utils/spinner.js";
import { logger } from "#/utils/logger.js";
import * as pm from "#/pm/index.js";

const gunzipAsync = promisify(gunzip);

const SKILLS_REPO = "minima-js/skills";

interface Manifest {
  description: string;
  packages: string[];
}

async function parseTarGz(buffer: Uint8Array): Promise<Record<string, string>> {
  const data = await gunzipAsync(buffer);
  const files: Record<string, string> = {};
  const decode = (buf: Uint8Array) => new TextDecoder().decode(buf).replace(/\0+$/, "");
  let offset = 0;

  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header[0] === 0) break;

    const name = decode(header.subarray(0, 100));
    const size = parseInt(decode(header.subarray(124, 136)).trim(), 8);
    const type = String.fromCharCode(header[156] ?? 0);

    offset += 512;

    if ((type === "0" || type === "\0") && !isNaN(size)) {
      files[name] = decode(data.subarray(offset, offset + size));
    }

    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}

async function downloadSkill(name: string): Promise<{ manifest: Manifest; files: Record<string, string> }> {
  const url = `https://github.com/${SKILLS_REPO}/releases/download/${name}/skill.tar.gz`;
  const res = await fetch(url);

  if (!res.ok) {
    logger.fatal(`Unknown skill: ${chalk.bold(name)}`);
  }

  const all = await parseTarGz(new Uint8Array(await res.arrayBuffer()));

  const manifestRaw = all["manifest.json"];
  if (!manifestRaw) {
    logger.fatal(`Invalid skill: missing manifest.json`);
  }

  const manifest = JSON.parse(manifestRaw!) as Manifest;
  const files = Object.fromEntries(
    Object.entries(all)
      .filter(([p]) => p.startsWith("files/"))
      .map(([p, c]) => [p.slice("files/".length), c])
  );

  return { manifest, files };
}

async function handle({ args }: { args: { name: string; install: boolean } }) {
  const { name } = args;

  const { manifest, files } = await withSpinner(`Downloading ${chalk.bold(name)} skill...`, () => downloadSkill(name));

  if (args.install && manifest.packages.length > 0) {
    const pkgs = manifest.packages.join(" ");
    logger.info(`  Installing ${chalk.bold(pkgs)}...`);
    pm.add(manifest.packages, { skipInstalled: true });
  }

  const created: string[] = [];

  for (const [dest, content] of Object.entries(files)) {
    if (exists(dest)) {
      logger.info(`  ${chalk.yellow("!")} Skipped ${chalk.cyan(dest)} (already exists)`);
      continue;
    }
    text.write.sync(dest, content, { ensuredir: true });
    created.push(dest);
  }

  logger.info(
    "",
    `  ${chalk.green("✔")} Added ${chalk.bold(chalk.cyan(name))} — ${manifest.description}`,
    "",
    ...(created.length > 0 ? [`  ${chalk.dim("Created:")}`, ...created.map((f) => `    ${chalk.cyan(f)}`)] : []),
    ""
  );
}

export const skill = defineCommand({
  meta: { name: "skill", description: "Install a skill from minima-js/skills" },
  args: {
    name: {
      type: "positional",
      description: "Skill name (e.g. auth, upload)",
      required: true,
    },
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation",
    },
  },
  run: handle,
});
