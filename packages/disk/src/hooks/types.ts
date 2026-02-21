import type { DiskFile } from "../file.js";
import type { PutOptions, FileMetadata, ListOptions, UrlOptions, DiskData } from "../types.js";

/**
 * Hook context for 'put' operation
 */

export interface PutHookContext {
  path: string;
  options: PutOptions;
  /** Set to skip the actual put operation */
  skipOperation?: boolean;
  /** Replace the result with custom metadata */
  result?: FileMetadata;
  /** The stream being uploaded (can be transformed by hooks) */
  stream?: ReadableStream<Uint8Array>;
} /**
 * Hook context for 'get' operation
 */

export interface GetHookContext {
  path: string;
  /** Set to skip the actual get operation */
  skipOperation?: boolean;
  /** Replace the result with custom file */
  result?: DiskFile | null;
} /**
 * Hook context for 'delete' operation
 */

export interface DeleteHookContext {
  path: string;
  /** Set to skip the actual delete operation */
  skipOperation?: boolean;
} /**
 * Hook context for 'exists' operation
 */

export interface ExistsHookContext {
  path: string;
  /** Set to skip the actual exists check */
  skipOperation?: boolean;
  /** Replace the result */
  result?: boolean;
} /**
 * Hook context for 'copy' operation
 */

export interface CopyHookContext {
  from: string;
  to: string;
  /** Set to skip the actual copy operation */
  skipOperation?: boolean;
  /** Replace the result with custom file */
  result?: DiskFile;
} /**
 * Hook context for 'move' operation
 */

export interface MoveHookContext {
  from: string;
  to: string;
  /** Set to skip the actual move operation */
  skipOperation?: boolean;
  /** Replace the result with custom file */
  result?: DiskFile;
}
/**
 * Hook context for 'url' operation
 */

export interface UrlHookContext {
  path: string;
  options?: UrlOptions;
  /** Set to skip the actual url generation */
  skipOperation?: boolean;
  /** Replace the result with custom URL */
  result?: string;
}
/**
 * Hook context for 'list' operation
 */

export interface ListHookContext {
  prefix?: string;
  options?: ListOptions;
  /** Set to skip the actual list operation */
  skipOperation?: boolean;
}
/**
 * Hook return types for stream/file transformations
 */

export type HookReturn<T> = void | Promise<void> | T | Promise<T>;
/**
 * All available disk hooks
 */

export interface DiskHooks {
  /** Called before put - can return transformed [path, data, options] */
  put(path: string, data: DiskData, options: PutOptions): HookReturn<[path: string, data: DiskData, options: PutOptions]>;
  /** Called after put - can return modified DiskFile */
  stored(file: DiskFile): HookReturn<DiskFile>;

  /** Called before get - can return transformed path */
  get(path: string): HookReturn<string>;
  /** Called after get - can return modified DiskFile */
  retrieved(file: DiskFile): HookReturn<DiskFile>;

  /** Called before delete */
  delete(path: string): HookReturn<void>;
  /** Called after delete */
  deleted(path: string): HookReturn<void>;

  /** Called before exists */
  exists(path: string): HookReturn<void>;
  /** Called after exists */
  checked(path: string, exists: boolean): HookReturn<void>;

  /** Called before copy - can return transformed [from, to] */
  copy(from: string, to: string): HookReturn<[from: string, to: string]>;
  /** Called after copy - can return modified DiskFile */
  copied(from: string, to: string, file: DiskFile): HookReturn<DiskFile>;

  /** Called before move - can return transformed [from, to] */
  move(from: string, to: string): HookReturn<[from: string, to: string]>;
  /** Called after move - can return modified DiskFile */
  moved(from: string, to: string, file: DiskFile): HookReturn<DiskFile>;

  /** Called after url is generated - can return modified url */
  url(path: string, url: string, options?: UrlOptions): HookReturn<string>;

  /** Called before list - can return transformed [prefix, options] */
  list(prefix: string, options: ListOptions): HookReturn<[prefix: string, options: ListOptions]>;

  /** Called when a file stream is accessed - can return transformed stream */
  streaming(stream: ReadableStream<Uint8Array>, file: DiskFile): HookReturn<ReadableStream<Uint8Array>>;
}

/** Derives the trigger's return type from the hook's declared return type */
export type TriggerReturn<K extends keyof DiskHooks> = Promise<Awaited<ReturnType<NonNullable<DiskHooks[K]>>>>;
