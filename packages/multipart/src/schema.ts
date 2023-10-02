import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { extname, join } from "node:path";
import { v4 as uuid } from "uuid";
import type { File } from "./file.js";
import { getFile } from "./multipart.js";

export interface UploaderConfig {
  path: string;
  publicPath?: string;
}

async function getFileName(info: File) {
  return `${uuid()}${extname(info.filename)}`;
}
export function createUploader({ path, publicPath = "/" }: UploaderConfig) {
  return async function upload(field: string, filename = getFileName) {
    const file = await getFile(field);
    const name = await filename(file);
    const writeStream = createWriteStream(join(path, name));
    await pipeline(file.stream, writeStream);
    return {
      url: `${publicPath}${name}`,
    };
  };
}
