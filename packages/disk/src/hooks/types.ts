import type { DiskFile } from "../file.js";
import type { PutOptions, ListOptions, UrlOptions, DiskData, FileSource } from "../types.js";

/**
 * Hook return types for stream/file transformations
 */
export type HookReturn<T> = void | T | Promise<void | T>;

/**
 * Discriminated union of (op, error, ...operation-args) tuples for the failed hook.
 * Handlers receive the operation name as the first argument so they can narrow the
 * remaining arguments to the exact types for that operation.
 */
export type FailedArgs =
  | [op: "put", error: unknown, path: string, data: DiskData, options: PutOptions]
  | [op: "get", error: unknown, path: string]
  | [op: "delete", error: unknown, source: FileSource];

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
  delete(source: FileSource): HookReturn<FileSource>;
  /** Called after delete */
  deleted(href: string): HookReturn<string>;

  /** Called before exists - can return transformed path */
  exists(path: string): HookReturn<string>;
  /** Called after exists - can return transformed result */
  checked(path: string, exists: boolean): HookReturn<boolean>;

  /** Called before copy - can return transformed [from, to] */
  copy(from: string, to: string): HookReturn<[from: string, to: string]>;
  /** Called after copy - can return modified DiskFile */
  copied(from: string, to: string, file: DiskFile): HookReturn<DiskFile>;

  /** Called before move - can return transformed [from, to] */
  move(from: FileSource, to: string): HookReturn<[from: FileSource, to: string]>;
  /** Called after move - can return modified DiskFile */
  moved(from: string, to: string, file: DiskFile): HookReturn<DiskFile>;

  /** Called after url is generated - can return modified url */
  url(path: string, url: string, options?: UrlOptions): HookReturn<string>;

  /** Called before list - can return transformed [prefix, options] */
  list(prefix: string, options: ListOptions): HookReturn<[prefix: string, options: ListOptions]>;

  /** Called when a file stream is accessed - can return transformed stream */
  streaming(stream: ReadableStream<Uint8Array>, file: DiskFile): HookReturn<ReadableStream<Uint8Array>>;

  /** Called when a file stream is being stored - can return transformed stream */
  storing(path: string, stream: ReadableStream<Uint8Array>, options: PutOptions): HookReturn<ReadableStream<Uint8Array>>;

  /** Called when constructing a DiskFile — can return a transformed DiskFile */
  file(file: DiskFile): HookReturn<DiskFile>;

  /**
   * Called when any disk operation throws. The handler **must** re-throw — the return
   * type is `never` to enforce this. If no handler is registered the original error is
   * re-thrown automatically. The first argument is the operation name so handlers can
   * narrow the remaining arguments to the exact types for that operation.
   */
  failed(...args: FailedArgs): never;
}

/** Derives the trigger's return type from the hook's declared return type */
export type TriggerReturn<K extends keyof DiskHooks> = Promise<Awaited<ReturnType<NonNullable<DiskHooks[K]>>>>;
