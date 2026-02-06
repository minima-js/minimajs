import type { DiskFile, KeyedFile } from "./file.js";

/**
 * Data types accepted for upload - matches web fetch BodyInit
 */
export type DiskData = ReadableStream | Blob | ArrayBufferView | ArrayBuffer | FormData | string;

/**
 * Source for copy/move operations - string key or any File with a key property
 */
export type FileSource = string | KeyedFile;

/**
 * Options for putting/storing a file
 */
export interface PutOptions {
  /** MIME type of the file */
  contentType?: string;
  /** Custom metadata to store with the file */
  metadata?: Record<string, string>;
  /** Cache-Control header value */
  cacheControl?: string;
}

/**
 * Options for generating signed/public URLs
 */
export interface UrlOptions {
  /** URL expiration time in seconds */
  expiresIn?: number;
  /** Content-Disposition for downloads (true = attachment, string = custom filename) */
  download?: boolean | string;
}

/**
 * Options for listing files
 */
export interface ListOptions {
  /** Maximum number of files to return per iteration */
  limit?: number;
  /** Cursor for pagination */
  cursor?: string;
  /** Include files in subdirectories */
  recursive?: boolean;
}

/**
 * File metadata without content
 */
export interface FileMetadata {
  key: string;
  size: number;
  contentType?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

/**
 * Storage driver interface - implement this for custom storage backends
 */
export interface DiskDriver {
  /** Driver name (e.g., 'fs', 's3', 'azure') */
  readonly name: string;

  /**
   * Store data at the given key
   * @param key - Storage path/key
   * @param data - File, Blob, ReadableStream, ArrayBuffer, or string
   * @param options - Optional metadata and content type
   */
  put(key: string, data: DiskData, options?: PutOptions): Promise<DiskFile>;

  /**
   * Retrieve file by key
   * @param key - Storage path/key
   * @returns DiskFile or null if not found
   */
  get(key: string): Promise<DiskFile | null>;

  /**
   * Delete file by key
   * @param key - Storage path/key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if file exists
   * @param key - Storage path/key
   */
  exists(key: string): Promise<boolean>;

  /**
   * Generate a URL for the file
   * @param key - Storage path/key
   * @param options - URL options (expiration, download disposition)
   */
  url(key: string, options?: UrlOptions): Promise<string>;

  /**
   * Copy a file to a new key
   * @param from - Source key or any File with a key property
   * @param to - Destination key
   */
  copy(from: FileSource, to: string): Promise<DiskFile>;

  /**
   * Move a file to a new key
   * @param from - Source key or any File with a key property
   * @param to - Destination key
   */
  move(from: FileSource, to: string): Promise<DiskFile>;

  /**
   * List files with optional prefix
   * @param prefix - Filter by key prefix
   * @param options - Pagination options
   */
  list(prefix?: string, options?: ListOptions): AsyncIterable<DiskFile>;

  /**
   * Get file metadata without content
   * @param key - Storage path/key
   */
  getMetadata(key: string): Promise<FileMetadata | null>;
}

/**
 * Disk instance returned by createDisk()
 */
export interface Disk {
  readonly driver: DiskDriver;
  put(key: string, data: DiskData, options?: PutOptions): Promise<DiskFile>;
  get(key: string): Promise<DiskFile | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  url(key: string, options?: UrlOptions): Promise<string>;
  copy(from: FileSource, to: string): Promise<DiskFile>;
  move(from: FileSource, to: string): Promise<DiskFile>;
  list(prefix?: string, options?: ListOptions): AsyncIterable<DiskFile>;
  getMetadata(key: string): Promise<FileMetadata | null>;
}
