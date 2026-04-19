import { defineCommand } from "citty";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { join } from "node:path";
import { symlinkSync } from "node:fs";
import chalk from "chalk";
import { exists, mkdir, text } from "#/utils/fs.js";
import { withSpinner } from "#/utils/spinner.js";
import { logger } from "#/utils/logger.js";

const gunzipAsync = promisify(gunzip);

const SKILLS_REPO = "minima-js/minimajs";
const SKILL_TAG = "skills";
const DEST_DIR = ".agents/skills";
const CLAUDE_SKILLS_DIR = ".claude/skills";

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
      files[name.replace(/^\.\//, "")] = decode(data.subarray(offset, offset + size));
    }

    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}

async function downloadSkill(): Promise<Record<string, string>> {
  const url = `https://github.com/${SKILLS_REPO}/releases/download/${SKILL_TAG}/skills.tar.gz`;
  const res = await fetch(url);

  if (!res.ok) {
    logger.fatal(`Failed to download skill bundle (HTTP ${res.status})`);
  }

  return parseTarGz(new Uint8Array(await res.arrayBuffer()));
}

function setupClaudeSymlink() {
  const target = join(process.cwd(), DEST_DIR);
  const link = join(process.cwd(), CLAUDE_SKILLS_DIR);

  if (exists(link)) {
    logger.info(`  ${chalk.yellow("!")} Skipped symlink ${chalk.cyan(link)} (already exists)`);
    return;
  }
  logger.info(`ensuring directory ${link}`);
  mkdir.sync(link);

  for (const name of ["minimajs"]) {
    symlinkSync(join(target, name), join(link, name));
    logger.info(
      `  ${chalk.green("✔")} Symlinked ${chalk.cyan(CLAUDE_SKILLS_DIR + "/" + name)} → ${chalk.cyan(DEST_DIR + "/" + name)}`
    );
  }
}

async function handle({ args }: { args: { claude: boolean } }) {
  const files = await withSpinner(`Downloading minimajs skill...`, () => downloadSkill());

  const created: string[] = [];

  for (const [name, content] of Object.entries(files)) {
    const dest = join(DEST_DIR, name);
    if (exists(dest)) {
      logger.info(`  ${chalk.yellow("!")} Skipped ${chalk.cyan(dest)} (already exists)`);
      continue;
    }
    text.write.sync(dest, content, { ensuredir: true });
    created.push(dest);
  }

  if (args.claude) {
    setupClaudeSymlink();
  }

  logger.info(
    "",
    `  ${chalk.green("✔")} Skill installed to ${chalk.cyan(DEST_DIR)}`,
    "",
    ...(created.length > 0 ? [`  ${chalk.dim("Created:")}`, ...created.map((f) => `    ${chalk.cyan(f)}`)] : []),
    ""
  );
}

export const skills = defineCommand({
  meta: { name: "skills", description: "Install minimajs skill for AI agents" },
  args: {
    claude: {
      type: "boolean",
      default: false,
      description: "Symlink skill into .claude/skills for Claude Code",
    },
  },
  run: handle,
});
