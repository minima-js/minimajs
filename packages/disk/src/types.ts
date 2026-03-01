import type { DiskHooks } from "./hooks/types.js";
import type { DiskFile } from "./file.js";
import type { FSWatcher } from "chokidar";

/**
 * Data types accepted for upload at Disk level (will be converted to streams)
 */
export type DiskData = ReadableStream | Blob | ArrayBufferView | ArrayBuffer | string | File;

/**
 * Source for copy/move operations - string key or DiskFile
 */
export type FileSource = string | File;

/**
 * Options for putting/storing a file
 * Extends FilePropertyBag to stay web-native
 */
export interface PutOptions extends FilePropertyBag {
  /**
   * Metadata to store with the file.
   * String-keyed entries are persisted by the driver.
   * Symbol-keyed entries are in-memory only — plugins use them to pass
   * private state through the hook pipeline without hitting the driver.
   */
  metadata?: DiskFile["metadata"];
  /** Cache-Control header value */
  cacheControl?: string;
  signal?: AbortSignal;
  /** Total byte size of the data — enables percentage in progress plugins */
  size?: number;
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
  signal?: AbortSignal;
}

/**
 * File metadata without content
 * Extends FilePropertyBag to stay web-native
 */
export interface FileMetadata extends FilePropertyBag {
  /** Absolute URL/URI with protocol (e.g., file:///path, s3://bucket/key, https://...) */
  href: string;
  size: number;
  /** Custom metadata to store with the file */
  metadata?: DiskFile["metadata"];
}

/**
 * Low-level storage driver interface - works with streams
 * Adapters only deal with ReadableStream/WritableStream
 * Drivers work with absolute URLs/URIs with protocols:
 * - file:///absolute/path/to/file
 * - s3://bucket-name/path/to/file
 * - https://storage.example.com/path/to/file
 */
/**
 * Capability declarations for a driver.
 * Every driver should implement this. An absent field or absent `capabilities`
 * object is treated as `false` — the feature is not supported.
 */
export interface DriverCapabilities {
  /**
   * Whether the driver persists and returns string-keyed metadata from PutOptions.
   * - `true`  — metadata round-trips through put → get
   * - `false` or absent — metadata is not supported / silently dropped
   */
  metadata?: boolean;
}

export interface DiskDriver {
  /** Driver name (e.g., 'fs', 's3', 'azure') */
  readonly name: string;

  /** Optional capability declarations — see {@link DriverCapabilities} */
  readonly capabilities?: DriverCapabilities;

  /**
   * Store data from a ReadableStream
   * @param href - Absolute URL/URI with protocol
   * @param stream - ReadableStream of data to store
   * @param options - Optional metadata and content type
   * @returns FileMetadata about the stored file
   */
  put(href: string, stream: ReadableStream<Uint8Array>, options: PutOptions): Promise<FileMetadata>;

  /**
   * Retrieve file as a ReadableStream with metadata
   * @param href - Absolute URL/URI with protocol
   * @returns Tuple of [stream, metadata] or null if not found
   */
  get(href: string): Promise<[file: ReadableStream<Uint8Array>, property: FileMetadata] | null>;

  /**
   * Delete file by href
   * @param href - Absolute URL/URI with protocol
   */
  delete(href: string): Promise<void>;

  /**
   * Check if file exists
   * @param href - Absolute URL/URI with protocol
   */
  exists(href: string): Promise<boolean>;

  /**
   * Generate a URL for the file
   * @param href - Absolute URL/URI with protocol
   * @param options - URL options (expiration, download disposition)
   */
  url(href: string, options?: UrlOptions): Promise<string>;

  /**
   * Copy a file to a new location
   * @param from - Source absolute URL/URI
   * @param to - Destination absolute URL/URI
   */
  copy(from: string, to: string): Promise<void>;

  /**
   * Move a file to a new location
   * @param from - Source absolute URL/URI
   * @param to - Destination absolute URL/URI
   */
  move(from: string, to: string): Promise<void>;

  /**
   * List files under a prefix href.
   * @param prefix - Absolute href prefix ending with `/`, or `""` to list everything.
   * @param options - Pagination options
   */
  list(prefix: string, options?: ListOptions): AsyncIterable<FileMetadata>;

  /**
   * Get file metadata without content
   * @param href - Absolute URL/URI with protocol
   */
  metadata(href: string): Promise<FileMetadata | null>;

  /**
   * Watch files for changes (optional - driver-specific)
   * @param pattern - Pattern to watch
   * @param options - Watch options
   * @returns FSWatcher instance from chokidar or undefined if not supported
   */
  watch?(pattern: string, options?: WatchOptions): FSWatcher | Promise<FSWatcher>;
}

/**
 * Disk instance - high-level API that converts data types to/from streams
 * This is the user-facing interface that handles DiskFile creation
 * @template TDriver - The specific driver type for type-safe access to driver-specific features
 */
export interface Disk<TDriver extends DiskDriver = DiskDriver> extends AsyncIterable<DiskFile> {
  readonly driver: TDriver;

  /**
   * Store data at the given key
   * Converts various data types to ReadableStream for the driver
   */
  put(data: File, options?: PutOptions): Promise<DiskFile>;
  put(key: string, data: DiskData, options?: PutOptions): Promise<DiskFile>;

  /**
   * Retrieve file by key
   * Converts driver's ReadableStream into a DiskFile
   */
  get(key: string): Promise<DiskFile | null>;

  delete(file: File): Promise<string>;
  delete(key: string): Promise<string>;
  exists(key: string): Promise<boolean>;
  url(key: string, options?: UrlOptions): Promise<string>;
  copy(from: File, to?: string): Promise<DiskFile>;
  copy(from: string, to: string): Promise<DiskFile>;
  move(from: File, to?: string): Promise<DiskFile>;
  move(from: string, to: string): Promise<DiskFile>;
  list(prefix?: string, options?: ListOptions): AsyncIterable<DiskFile>;
  metadata(key: string): Promise<FileMetadata | null>;

  /**
   * Register a hook (for use by plugins)
   */
  hook<K extends keyof DiskHooks>(event: K, handler: DiskHooks[K]): () => void;

  /**
   * Watch files matching a pattern for changes
   * @throws Error if driver does not support watching
   */
  watch(pattern: string, options?: WatchOptions): FSWatcher | Promise<FSWatcher>;
}

/**
 * Watch options
 */
export interface WatchOptions {
  /** Watch subdirectories recursively (default: true) */
  recursive?: boolean;
  /** Ignore initial add events (default: true) */
  ignoreInitial?: boolean;
  /** Additional chokidar options */
  chokidar?: any;
}

/**
 * Storage information
 */
export interface StorageInfo {
  /** Total storage capacity in bytes (null if unlimited) */
  total: number | null;
  /** Used storage in bytes */
  used: number;
  /** Available storage in bytes (null if unlimited) */
  available: number | null;
  /** Free storage in bytes (null if unlimited) */
  free: number | null;
  /** Number of files */
  files?: number;
}

/**
 * Options for creating a proto disk that can route operations
 * to different drivers based on URL prefixes (protocol + optional base path)
 */
export interface ProtoDiskOptions {
  /**
   * Map of URL prefixes to their respective drivers
   * Supports both protocol-only and full prefix matching:
   * - Protocol only: 'file://', 's3://', 'https://'
   * - Full prefix: 's3://bucket-1/', 's3://bucket-2/', 'https://cdn.example.com/'
   * Longer prefixes are matched first (most specific wins)
   */
  protocols: Record<string, DiskDriver>;
  /** Default protocol/prefix to use for relative paths */
  defaultProtocol?: string;
  /** Base path for resolving relative paths */
  basePath?: string;
  /** Initial hooks to register */
  hooks?: Partial<DiskHooks>;
}
