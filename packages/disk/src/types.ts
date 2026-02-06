import type { DiskFile } from "./file.js";

/**
 * Data types accepted for upload - matches web fetch BodyInit
 */
export type DiskData = ReadableStream | Blob | ArrayBufferView | ArrayBuffer | FormData | string;

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
}
