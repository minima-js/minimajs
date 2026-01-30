import type { BusboyConfig, BusboyFileStream } from "@fastify/busboy";
import type { RAW_FIELD, RAW_FILE } from "./raw/index.js";

export type MultipartOptions = Omit<BusboyConfig, "headers">;

export interface MultipartRawFile {
  fieldname: string;
  filename: string;
  transferEncoding: string;
  mimeType: string;
  stream: BusboyFileStream;
  [RAW_FILE]: true;
}

export interface MultipartRawField {
  fieldname: string;
  value: string;
  fieldnameTruncated: boolean;
  valueTruncated: boolean;
  transferEncoding: string;
  mimeType: string;
  [RAW_FIELD]: true;
}
export type MultipartRawResult = MultipartRawFile | MultipartRawField;
