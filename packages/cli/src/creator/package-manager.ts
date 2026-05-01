import chalk from "chalk";
import { logger } from "#/utils/logger.js";
import { pkgm, type PM } from "../pkgm/index.js";
import { corepack } from "../corepack/index.js";

export interface ResolvedPM {
  manager: PM;
  version: string;
}

interface PMArg {
  manager: PM;
  versionHint?: string;
}

function parsePMArg(arg: string): PMArg {
  const atIndex = arg.indexOf("@");
  if (atIndex === -1) {
    if (!pkgm.isValid(arg)) {
      logger.fatal(`Invalid package manager: ${chalk.bold(arg)}. Must be one of: ${pkgm.VALID.join(", ")}, yarn@<version>`);
    }
    return { manager: arg };
  }

  const name = arg.slice(0, atIndex);
  const versionHint = arg.slice(atIndex + 1) || undefined;
  if (!pkgm.isValid(name)) {
    logger.fatal(`Invalid package manager: ${chalk.bold(arg)}. Must be one of: ${pkgm.VALID.join(", ")}, yarn@<version>`);
  }
  return { manager: name, versionHint };
}

function resolveVersion(manager: PM, hint?: string): string {
  if (hint && corepack.isManaged(manager)) {
    return corepack.version(manager, hint);
  }
  const version = pkgm.version(manager);
  if (!version) logger.fatal(`${manager} is not installed or could not be detected.`);
  return version;
}

export function resolvePM(pmArg?: string): ResolvedPM {
  let manager: PM;
  let versionHint: string | undefined;

  if (pmArg) {
    const parsed = parsePMArg(pmArg);
    manager = parsed.manager;
    versionHint = parsed.versionHint;
  } else {
    const agent = pkgm.userAgent();
    manager = agent?.manager ?? "npm";
    versionHint = agent?.version;
  }

  if (manager === "yarn") {
    const isBerry = versionHint ? parseInt(versionHint, 10) >= 2 : pkgm.isYarnBerry();
    if (isBerry && !corepack()) {
      logger.fatal(`Yarn Berry requires Corepack. Install it with: ${chalk.bold("npm install -g corepack")}`);
    }
  }

  return { manager, version: resolveVersion(manager, versionHint) };
}
