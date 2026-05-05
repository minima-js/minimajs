import chalk from "chalk";
import { logger } from "#/utils/logger.js";
import { pkgm, type PM } from "../pkgm/index.js";
import { corepack, type CorepackPM } from "../corepack/index.js";

export type ResolvedPM =
  | {
      manager: PM;
      version: string;
      isCorepack: false;
    }
  | {
      manager: CorepackPM;
      version: string;
      isCorepack: true;
    };

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

export function resolvePM(pmArg?: string, forceCorepack?: boolean): ResolvedPM {
  if (forceCorepack) {
    corepack.ensure();
  }

  if (!pmArg) {
    const agent = pkgm.userAgent();
    const manager = agent?.manager ?? "npm";
    const version = agent?.version ?? pkgm.version("npm");
    if (forceCorepack && corepack.isManaged(manager)) {
      return { isCorepack: true, manager, version: corepack.version(manager, version) };
    }
    return { isCorepack: false, manager, version };
  }

  const { manager, versionHint } = parsePMArg(pmArg);

  if (corepack.isManaged(manager) && (forceCorepack || versionHint)) {
    corepack.ensure();
    return { isCorepack: true, manager, version: corepack.version(manager, versionHint ?? "latest") };
  }

  return { isCorepack: false, manager, version: pkgm.version(manager) };
}
