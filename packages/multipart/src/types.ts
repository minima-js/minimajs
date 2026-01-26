import type { BusboyConfig, BusboyFileStream } from "@fastify/busboy";
import type { Stream2uint8arrayOptions } from "./stream.js";

export type MultipartOptions = Omit<BusboyConfig, "headers">;
export type MultipartFileOptions = MultipartOptions & Stream2uint8arrayOptions;

export interface MultipartRawFile {
  fieldname: string;
  stream: BusboyFileStream;
  filename: string;
  transferEncoding: string;
  mimeType: string;
}

export interface MultipartRawField {
  fieldname: string;
  value: string;
  fieldnameTruncated: boolean;
  valueTruncated: boolean;
  transferEncoding: string;
  mimeType: string;
}
export type MultipartRawResult = MultipartRawFile | MultipartRawField;
