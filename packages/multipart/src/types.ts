import type { BusboyConfig, BusboyFileStream } from "@fastify/busboy";

export type MultipartOptions = Omit<BusboyConfig, "headers">;

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
