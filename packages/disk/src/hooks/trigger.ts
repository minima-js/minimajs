import { DiskFile, type StreamFactory } from "../file.js";
import { getMimeType, resolveKey, setDisk, toReadableStream } from "../helpers.js";
import type { Disk, DiskData, DiskDriver, FileMetadata, FileSource, ListOptions, PutOptions, UrlOptions } from "../types.js";
import type { DiskHooks } from "./types.js";

export type DiskHookStore = {
  [K in keyof DiskHooks]?: Set<DiskHooks[K]>;
};

export class HookTrigger {
  constructor(
    private readonly hooks: DiskHookStore,
    private readonly disk: Disk<DiskDriver>
  ) {}

  async put(
    path: string,
    data: DiskData,
    options: PutOptions
  ): Promise<[path: string, data: ReadableStream, options: PutOptions]> {
    const hooks = this.hooks["put"] ?? new Set();
    let returned: [string, DiskData, PutOptions] = [path, data, options];
    for (const handler of hooks) {
      const result = await handler(...returned);
      if (result) returned = result;
    }
    const [$path, $data, $options] = returned;

    if (!$options.type) {
      if ($data instanceof Blob) {
        $options.type = $data.type;
      } else {
        $options.type = getMimeType($path);
      }
    }

    const { signal } = $options;

    const stream = toReadableStream($data);
    if (signal) {
      if (signal.aborted) {
        stream.cancel(signal.reason);
      } else {
        signal.addEventListener("abort", () => {
          stream.cancel(signal.reason);
        });
      }
    }

    return [$path, stream, $options];
  }

  async stored(file: DiskFile) {
    const hooks = this.hooks["stored"] ?? [];
    let result = file;
    for (const handler of [...hooks].reverse()) {
      const r = await handler(result);
      if (r) result = r;
    }
    return result;
  }

  async get(path: string) {
    for (const handler of this.hooks["get"] ?? []) {
      const r = await handler(path);
      if (r) path = r;
    }
    return path;
  }

  async retrieved(file: DiskFile) {
    const hooks = this.hooks["retrieved"] ?? [];
    for (const handler of [...hooks].reverse()) {
      const result = await handler(file);
      if (result) file = result;
    }
    return file;
  }

  async delete(source: FileSource): Promise<string> {
    for (const handler of this.hooks["delete"] ?? []) {
      const res = await handler(source);
      if (res) source = res;
    }
    return resolveKey(source);
  }

  async deleted(path: string): Promise<string> {
    for (const handler of this.hooks["deleted"] ?? []) {
      const res = await handler(path);
      if (res) path = res;
    }

    return path;
  }

  async exists(path: string): Promise<string> {
    for (const handler of this.hooks["exists"] ?? []) {
      const res = await handler(path);
      if (res !== undefined) {
        path = res;
      }
    }
    return path;
  }

  async checked(exists: boolean, path: string): Promise<boolean> {
    for (const handler of this.hooks["checked"] ?? []) {
      const res = await handler(path, exists);
      if (res !== undefined) exists = res;
    }
    return exists;
  }

  async copy(from: string, to: string): Promise<[string, string]> {
    let result: [string, string] = [from, to];
    for (const handler of this.hooks["copy"] ?? []) {
      const r = await handler(...result);
      if (r) result = r;
    }
    return result;
  }

  async copied(from: string, to: string, file: DiskFile): Promise<DiskFile> {
    let result = file;
    for (const handler of [...(this.hooks["copied"] ?? [])].reverse()) {
      const r = await handler(from, to, result);
      if (r instanceof DiskFile) result = r;
    }
    return result;
  }

  async move(from: FileSource, to: string): Promise<[from: string, to: string]> {
    let result: [FileSource, string] = [from, to];
    for (const handler of this.hooks["move"] ?? []) {
      const r = await handler(...result);
      if (r) result = r;
    }
    return [resolveKey(result[0]), result[1]];
  }

  async moved(from: string, to: string, file: DiskFile): Promise<DiskFile> {
    let result = file;
    for (const handler of [...(this.hooks["moved"] ?? [])].reverse()) {
      const r = await handler(from, to, result);
      if (r instanceof DiskFile) result = r;
    }
    return result;
  }

  async url(path: string, generatedUrl: string, options?: UrlOptions): Promise<string> {
    let result = generatedUrl;
    for (const handler of [...(this.hooks["url"] ?? [])].reverse()) {
      const r = await handler(path, result, options);
      if (r) result = r;
    }
    return result;
  }

  async list(prefix?: string, options?: ListOptions) {
    let result: [prefix: string, options: ListOptions] = [prefix ?? "", options ?? {}];
    for (const handler of this.hooks.list ?? new Set()) {
      const r = await handler(...result);
      if (r) result = r;
    }
    return result;
  }

  async streaming(stream: ReadableStream, file: DiskFile) {
    const hooks = this.hooks["streaming"] ?? [];
    for (const handler of [...hooks].reverse()) {
      const result = await handler(stream, file);
      if (result) stream = result;
    }
    return stream;
  }
  async storing(path: string, stream: ReadableStream, options: PutOptions) {
    const hooks = this.hooks["storing"] ?? [];
    for (const handler of hooks) {
      const result = await handler(path, stream, options);
      if (result) stream = result;
    }
    return stream;
  }

  async file(filename: string, metadata: FileMetadata, factory: StreamFactory): Promise<DiskFile> {
    let file = new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type || getMimeType(metadata.href),
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: factory,
    });
    for (const handler of this.hooks["file"] ?? []) {
      const result = await handler(file);
      if (result instanceof DiskFile) file = result;
    }
    setDisk(file, this.disk);
    return file;
  }

  private async runFailed(key: keyof DiskHooks, error: unknown, ...args: unknown[]): Promise<never> {
    let current = error;
    const hooks = this.hooks[key];
    if (!hooks) throw current;
    for (const handler of [...hooks].reverse()) {
      try {
        await (handler as any)(current, ...args);
      } catch (e) {
        current = e;
      }
    }
    throw current;
  }

  putFailed(error: unknown, path: string, data: DiskData, options: PutOptions): Promise<never> {
    return this.runFailed("put:failed", error, path, data, options);
  }

  getFailed(error: unknown, path: string): Promise<never> {
    return this.runFailed("get:failed", error, path);
  }

  deleteFailed(error: unknown, href: string): Promise<never> {
    return this.runFailed("delete:failed", error, href);
  }
}
