import { DiskFile } from "../file.js";
import { getMimeType, toReadableStream } from "../helpers.js";
import type { DiskData, FileSource, ListOptions, PutOptions, UrlOptions } from "../types.js";
import type { DiskHooks } from "./types.js";

type DiskHookStore = {
  [K in keyof DiskHooks]?: Set<DiskHooks[K]>;
};

export class HookTrigger {
  constructor(private readonly hooks: DiskHookStore) {}

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

    if (!options.type) {
      if (data instanceof Blob) {
        options.type = data.type;
      } else {
        options.type = getMimeType(path);
      }
    }
    return [$path, toReadableStream($data), $options];
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

  async delete(path: string): Promise<string> {
    for (const handler of this.hooks["delete"] ?? []) {
      const res = await handler(path);
      if (res) path = res;
    }
    return path;
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
    const fromHref = typeof from === "string" ? from : from.href;
    return [fromHref, to];
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
}
