import type { Readable } from "stream";
import type { AzureBlob } from "./azure-blob.js";

interface Info {
  filename: string;
  mimeType: string;
}

export function createUploader(client: AzureBlob) {
  return function upload(info: Info, buff: Buffer | Readable) {};
}
