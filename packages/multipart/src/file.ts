import assert from "node:assert";
import { type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { extname, join } from "node:path";
import { createWriteStream } from "node:fs";

import { v4 as uuid } from "uuid";
import { stream2void, stream2buffer } from "./stream.js";

/**
 * Metadata information about an uploaded file from a multipart form request.
 * Contains file details and the readable stream of the file content.
 */
export interface FileInfo {
  /** The form field name associated with this file */
  readonly field: string;
  /** The original filename provided by the client */
  readonly filename: string;
  /** The encoding of the file (e.g., '7bit', 'binary') */
  readonly encoding: string;
  /** The MIME type of the file (e.g., 'image/png', 'application/pdf') */
  readonly mimeType: string;
  /** The readable stream containing the file content */
  readonly stream: Readable;
}

/**
 * Represents an uploaded file from a multipart form request.
 * Provides methods to handle file operations such as reading, moving, and buffering.
 *
 * @example
 * ```ts
 * const file = await getFile('avatar');
 * // Save to disk
 * await file.move('/uploads', 'avatar.png');
 * // Or read as buffer
 * const buffer = await file.buffer();
 * ```
 */
export class File implements FileInfo {
  #randomName?: string;
  #buffer?: Buffer;
  #ext?: string;
  constructor(
    public readonly field: string,
    public readonly filename: string,
    public readonly encoding: string,
    public readonly mimeType: string,
    private readonly _stream?: Readable
  ) {}

  /**
   * Gets the file extension from the filename.
   * @returns The file extension including the dot (e.g., '.png', '.pdf')
   */
  get ext() {
    this.#ext ??= extname(this.filename);
    return this.#ext;
  }

  /**
   * Generates a random UUID-based filename while preserving the original extension.
   * Useful for storing files with unique names to prevent collisions.
   * @returns A UUID filename with the original file extension
   */
  get randomName() {
    this.#randomName ??= `${uuid()}${this.ext}`;
    return this.#randomName;
  }

  /**
   * Factory method to create a File instance from FileInfo.
   * @param info - The file information object
   * @returns A new File instance
   */
  static create(info: FileInfo, _: any) {
    return new File(info.field, info.filename, info.encoding, info.mimeType, info.stream);
  }

  /**
   * Gets the readable stream of the file content.
   * @throws {AssertionError} If the stream is not available
   * @returns The readable stream
   */
  get stream() {
    assert(this._stream, "stream is empty");
    return this._stream;
  }

  /**
   * Reads the entire file content into a Buffer.
   * The buffer is cached, so subsequent calls return the same buffer without re-reading.
   *
   * @returns A promise that resolves to the file content as a Buffer
   * @example
   * ```ts
   * const file = await getFile('document');
   * const buffer = await file.buffer();
   * console.log(buffer.length);
   * ```
   */
  async buffer() {
    this.#buffer ??= await stream2buffer(this.stream);
    return this.#buffer;
  }

  /**
   * Moves the file to a specified directory with an optional custom filename.
   * If no filename is provided, a random UUID-based name is used.
   *
   * @param dir - The destination directory (defaults to current working directory)
   * @param filename - The filename to save as (defaults to a random UUID name)
   * @returns A promise that resolves to the filename used
   * @example
   * ```ts
   * const file = await getFile('upload');
   * // Save with random name
   * await file.move('/uploads');
   * // Save with custom name
   * await file.move('/uploads', 'myfile.pdf');
   * ```
   */
  async move(dir = process.cwd(), filename = this.randomName) {
    await pipeline(this.stream, createWriteStream(join(dir, filename)));
    return filename;
  }

  /**
   * Discards the file content by consuming the stream without storing it.
   * Useful when you want to skip processing a file but need to consume its stream.
   *
   * @returns A promise that resolves when the stream is fully consumed
   */
  flush() {
    return pipeline(this.stream, stream2void());
  }
}

/**
 * Type guard to check if a value is an instance of File.
 *
 * @example
 * ```ts
 * if (isFile(value)) {
 *   await value.move('/uploads');
 * }
 * ```
 */
export function isFile(f: unknown): f is File {
  return f instanceof File;
}
