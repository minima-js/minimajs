import $module from "./module.stub";
import handler from "./handler.stub";
import service from "./service.stub";
import middleware from "./middleware.stub";
import plugin from "./plugin.stub";
import hook from "./hook.stub";
import diskFile from "./disk/file.stub";
import diskS3 from "./disk/s3.stub";
import diskAzureBlob from "./disk/azure-blob.stub";
import dockerBun from "./docker/bun.stub";
import dockerNpm from "./docker/npm.stub";
import dockerPnpm from "./docker/pnpm.stub";
import dockerYarn from "./docker/yarn.stub";
import dockerBerry from "./docker/berry.stub";
import eslintConfig from "./eslint.config.js.stub";
import prettierConfig from "./prettier.config.js.stub";
import type { Stub } from "#/types.js";

type NamedVars = { name: string };
type InstanceVars = { instance: string };
type DockerVars = { version: string };

export const templates = {
  disk: {
    file: diskFile as Stub,
    s3: diskS3 as Stub,
    "azure-blob": diskAzureBlob as Stub,
  },
  docker: {
    bun: dockerBun as Stub<DockerVars>,
    npm: dockerNpm as Stub<DockerVars>,
    pnpm: dockerPnpm as Stub<DockerVars>,
    yarn: dockerYarn as Stub<DockerVars>,
    berry: dockerBerry as Stub<{ version: string }>,
  },
  configs: {
    eslint: eslintConfig as Stub,
    prettier: prettierConfig as Stub,
  },
  module: $module as Stub<NamedVars>,
  handler: handler as Stub,
  service: service as Stub<NamedVars>,
  middleware: middleware as Stub<InstanceVars>,
  plugin: plugin as Stub<InstanceVars>,
  hook: hook as Stub<InstanceVars>,
};

export type GeneratorType = keyof typeof templates;
