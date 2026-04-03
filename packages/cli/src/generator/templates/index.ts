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

export const templates = {
  module: $module,
  handler,
  service,
  middleware,
  plugin,
  hook,
};

export const diskTemplates = {
  file: diskFile,
  s3: diskS3,
  "azure-blob": diskAzureBlob,
};

export const dockerTemplates = {
  bun: dockerBun,
  npm: dockerNpm,
  pnpm: dockerPnpm,
  yarn: dockerYarn,
  berry: dockerBerry,
};

export type GeneratorType = keyof typeof templates;
