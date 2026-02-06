import path from "node:path";
import { type BlobHTTPHeaders, BlobServiceClient, BlockBlobClient, ContainerClient } from "@azure/storage-blob";
import { v4 as uuid } from "uuid";
import type { BlobUploadCommonResponse } from "@azure/storage-blob";
import type { Readable } from "node:stream";

// Export the new disk driver
export { createAzureBlobDriver, type AzureBlobDriverOptions } from "./driver.js";

export interface StorageConfig {
  container: string;
  connection: string;
  cname?: string;
}

export interface StorageUploadResponse {
  filename: string;
  url: string;
  response: BlobUploadCommonResponse;
}

export interface FileType {
  /** Name of the file on the uploader's computer. */
  originalname: string;
  /** Value of the `Content-Type` header for this file. */
  mimetype: string;
  /** Size of the file in bytes. */
  /** `MemoryStorage` only: A Buffer containing the entire file. */
  buffer: Buffer;
}

export interface FileInfo {
  stream: Readable;
  filename: string;
  mimetype: string;
}

export const STORAGE_OPTION = Symbol("storage option");

export class AzureBlob {
  #container: ContainerClient;
  #client: BlobServiceClient;

  #cname: string | undefined;

  constructor({ container, cname, connection }: StorageConfig) {
    this.#cname = cname;
    this.#client = BlobServiceClient.fromConnectionString(connection);
    this.#container = this.#client.getContainerClient(container);
  }

  container(containerName: string) {
    this.#container = this.#client.getContainerClient(containerName);
    return this;
  }

  cname(name: string) {
    this.#cname = name;
    return this;
  }

  async syncContainer() {
    if (await this.#container.exists()) {
      return;
    }
    await this.#container.create();
    return this;
  }

  async putStream(file: FileInfo, headers?: BlobHTTPHeaders): Promise<StorageUploadResponse> {
    const { stream, filename, mimetype } = file;
    const name = this.#getFilename(filename);
    const blob = this.#container.getBlockBlobClient(name);
    const response = await blob.uploadStream(stream, undefined, undefined, {
      blobHTTPHeaders: {
        blobContentType: mimetype!,
        ...headers,
      },
    });
    return { response, filename: name, url: this.#getURL(blob) };
  }

  async put({ buffer, originalname, mimetype }: FileType, headers?: BlobHTTPHeaders): Promise<StorageUploadResponse> {
    const name = this.#getFilename(originalname);
    const blob = this.#getBlob(name);
    const response = await blob.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: mimetype!,
        ...headers,
      },
    });
    return { response, filename: name, url: this.#getURL(blob) };
  }

  exists(name: string) {
    const blob = this.#container.getBlockBlobClient(name);
    return blob.exists();
  }

  async putBase64(content: string, originalname: string, mimetype = "application/octet-stream") {
    return this.put({
      buffer: Buffer.from(content, "base64"),
      originalname,
      mimetype,
    });
  }

  delete(filename: string) {
    return this.#getBlob(this.#getBlobName(filename)).delete();
  }

  #getBlobName(url: string) {
    const [, matched = url] = url.match(new RegExp(`/${this.#container.containerName}/(.+)`)) ?? [];
    return matched;
  }

  #getBlob(name: string) {
    return this.#container.getBlockBlobClient(name);
  }

  #getFilename(original: string) {
    return `${uuid()}${path.extname(original)}`;
  }

  #getURL(blob: BlockBlobClient) {
    if (this.#cname) {
      return `${this.#cname}/${blob.containerName}/${blob.name}`;
    }
    return blob.url;
  }
}
