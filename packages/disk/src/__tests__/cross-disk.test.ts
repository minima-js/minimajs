/**
 * Tests for cross-disk File operations — copying/moving DiskFile instances
 * between separate Disk instances (different drivers).
 */
import { describe, test, expect } from "@jest/globals";
import { createDisk } from "../index.js";
import { createMemoryDriver } from "../adapters/memory.js";

function makeDisk() {
  return createDisk({ driver: createMemoryDriver() });
}

describe("cross-disk copy", () => {
  test("copies a DiskFile from one disk to another", async () => {
    const diskA = makeDisk();
    const diskB = makeDisk();

    await diskA.put("source.txt", "cross-disk content");
    const sourceFile = await diskA.get("source.txt");
    expect(sourceFile).toBeTruthy();

    const copied = await diskB.copy(sourceFile!);

    expect(await diskB.exists(copied.name)).toBeTruthy();
    const retrieved = await diskB.get(copied.name);
    expect(retrieved).toBeTruthy();
    expect(await retrieved!.text()).toBe("cross-disk content");
  });

  test("original file remains on source disk after cross-disk copy", async () => {
    const diskA = makeDisk();
    const diskB = makeDisk();

    await diskA.put("original.txt", "keep me");
    const sourceFile = await diskA.get("original.txt");
    expect(sourceFile).toBeTruthy();

    await diskB.copy(sourceFile!);

    expect(await diskA.exists("original.txt")).toBe(true);
  });

  test("cross-disk copy with explicit target path", async () => {
    const diskA = makeDisk();
    const diskB = makeDisk();

    await diskA.put("file.txt", "hello");
    const sourceFile = await diskA.get("file.txt");
    expect(sourceFile).toBeTruthy();

    const copied = await diskB.copy(sourceFile!, "renamed.txt");

    expect(copied.name).toBe("renamed.txt");
    expect(await diskB.exists("renamed.txt")).toBe(true);
  });

  test("same-disk copy with DiskFile requires explicit target path", async () => {
    const disk = makeDisk();

    await disk.put("file.txt", "data");
    const file = await disk.get("file.txt");
    expect(file).toBeTruthy();

    await expect(disk.copy(file!)).rejects.toThrow(/Explicit target path required/);
  });

  test("same-disk copy with DiskFile and explicit target", async () => {
    const disk = makeDisk();

    await disk.put("file.txt", "data");
    const file = await disk.get("file.txt");
    expect(file).toBeTruthy();

    const copied = await disk.copy(file!, "copy.txt");

    expect(copied.name.endsWith("copy.txt")).toBeTruthy();
    expect(await disk.exists("file.txt")).toBe(true);
    expect(await disk.exists("copy.txt")).toBe(true);
  });
});

describe("cross-disk move", () => {
  test("moves a DiskFile from one disk to another", async () => {
    const diskA = makeDisk();
    const diskB = makeDisk();

    await diskA.put("move-me.txt", "move content");
    const sourceFile = await diskA.get("move-me.txt");
    expect(sourceFile).toBeTruthy();

    const moved = await diskB.move(sourceFile!);

    // File should exist on diskB
    expect(await diskB.exists(moved.name)).toBeTruthy();

    // File should be deleted from diskA
    expect(await diskA.exists("move-me.txt")).toBe(false);
  });

  test("cross-disk move with explicit target path", async () => {
    const diskA = makeDisk();
    const diskB = makeDisk();

    await diskA.put("src.txt", "payload");
    const sourceFile = await diskA.get("src.txt");
    expect(sourceFile).toBeTruthy();

    const moved = await diskB.move(sourceFile!, "dest.txt");

    expect(moved.name).toBe("dest.txt");
    expect(await diskB.exists("dest.txt")).toBe(true);
    expect(await diskA.exists("src.txt")).toBe(false);
  });

  test("same-disk move with DiskFile requires explicit target path", async () => {
    const disk = makeDisk();

    await disk.put("file.txt", "data");
    const file = await disk.get("file.txt");
    expect(file).toBeTruthy();

    await expect(disk.move(file!)).rejects.toThrow(/Explicit target path required/);
  });
});

describe("Symbol.asyncIterator on StandardDisk", () => {
  test("iterates all files via for-await", async () => {
    const disk = makeDisk();

    await disk.put("a.txt", "a");
    await disk.put("b.txt", "b");
    await disk.put("c.txt", "c");

    const hrefs: string[] = [];
    for await (const file of disk) {
      hrefs.push(file.href);
    }

    expect(hrefs.length).toBe(3);
  });

  test("returns empty iterator when disk has no files", async () => {
    const disk = makeDisk();

    const files: string[] = [];
    for await (const file of disk) {
      files.push(file.href);
    }

    expect(files.length).toBe(0);
  });
});

describe("DiskFile", () => {
  test("text() returns string content", async () => {
    const disk = makeDisk();
    await disk.put("text.txt", "hello world");
    const file = await disk.get("text.txt");
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("hello world");
  });

  test("arrayBuffer() returns content as ArrayBuffer", async () => {
    const disk = makeDisk();
    await disk.put("buf.bin", "binary");
    const file = await disk.get("buf.bin");
    expect(file).toBeTruthy();
    const buf = await file!.arrayBuffer();
    expect(buf instanceof ArrayBuffer).toBeTruthy();
    expect(new TextDecoder().decode(buf)).toBe("binary");
  });

  test("bytes() returns Uint8Array", async () => {
    const disk = makeDisk();
    await disk.put("bytes.bin", "data");
    const file = await disk.get("bytes.bin");
    expect(file).toBeTruthy();
    const bytes = await file!.bytes();
    expect(bytes instanceof Uint8Array).toBeTruthy();
    expect(new TextDecoder().decode(bytes)).toBe("data");
  });

  test("bytes() caches the result on repeated calls", async () => {
    const disk = makeDisk();
    await disk.put("cached.txt", "content");
    const file = await disk.get("cached.txt");
    expect(file).toBeTruthy();
    const first = await file!.bytes();
    const second = await file!.bytes();
    expect(first).toBe(second);
  });

  test("stream() returns a ReadableStream", async () => {
    const disk = makeDisk();
    await disk.put("stream.txt", "streamed");
    const file = await disk.get("stream.txt");
    expect(file).toBeTruthy();
    const stream = file!.stream();
    expect(stream instanceof ReadableStream).toBeTruthy();
  });

  test("size reflects stored byte length", async () => {
    const disk = makeDisk();
    await disk.put("sized.txt", "12345");
    const file = await disk.get("sized.txt");
    expect(file).toBeTruthy();
    expect(file!.size).toBe(5);
  });

  test("href is set correctly", async () => {
    const disk = makeDisk();
    const stored = await disk.put("named.txt", "x");
    expect(stored.href.endsWith("named.txt")).toBeTruthy();
  });
});

describe("hooks API", () => {
  test("hook() registers a handler and returns an unsubscribe function", async () => {
    const disk = makeDisk();
    const calls: string[] = [];

    const unsubscribe = disk.hook("put", (path, _data, _opts) => {
      calls.push(path);
    });

    await disk.put("tracked.txt", "data");
    expect(calls.includes("tracked.txt")).toBeTruthy();

    // After unsubscribing, the hook should not be called
    unsubscribe();
    await disk.put("untracked.txt", "data");
    expect(calls.includes("untracked.txt")).toBeFalsy();
  });

  test("hooks option on createDisk registers handlers upfront", async () => {
    const seen: string[] = [];

    const disk = createDisk({
      driver: createMemoryDriver(),
      hooks: {
        put(path) {
          seen.push(path);
        },
      },
    });

    await disk.put("early.txt", "content");
    expect(seen.includes("early.txt")).toBeTruthy();
  });

  test("put hook can rewrite the path", async () => {
    const disk = createDisk({
      driver: createMemoryDriver(),
      hooks: {
        put(path, data, opts) {
          return [`prefixed/${path}`, data, opts];
        },
      },
    });

    const stored = await disk.put("file.txt", "x");
    expect(stored.href.includes("prefixed/file.txt")).toBeTruthy();
  });

  test("put hook transformed path/data/options are respected end-to-end", async () => {
    const disk = createDisk({
      driver: createMemoryDriver(),
      hooks: {
        put(_path, _data, opts) {
          const transformed = new Blob(["hooked"], { type: "application/x-hooked" });
          return ["rewritten.bin", transformed, { ...opts, type: transformed.type }];
        },
      },
    });

    const stored = await disk.put("original.txt", "ignored");
    expect(stored.href.endsWith("rewritten.bin")).toBeTruthy();
    expect(stored.type).toBe("application/x-hooked");

    const loaded = await disk.get("rewritten.bin");
    expect(loaded).toBeTruthy();
    expect(await loaded!.text()).toBe("hooked");
  });

  test("stored hook receives the final DiskFile", async () => {
    const disk = makeDisk();
    const storedHrefs: string[] = [];

    disk.hook("stored", (file) => {
      storedHrefs.push(file.href);
    });

    await disk.put("tracked.txt", "value");
    expect(storedHrefs.length).toBe(1);
    expect(storedHrefs[0]!.endsWith("tracked.txt")).toBeTruthy();
  });

  test("put failure after driver write does not auto-delete target", async () => {
    const disk = makeDisk();
    let failOnce = true;

    disk.hook("stored", () => {
      if (!failOnce) return;
      failOnce = false;
      throw new Error("stored hook failure");
    });

    await expect(disk.put("kept.txt", "first")).rejects.toThrow("stored hook failure");
    expect(await disk.exists("kept.txt")).toBe(true);
  });

  test("deleted hook fires with the deleted file href", async () => {
    const disk = makeDisk();
    const deletedPaths: string[] = [];

    disk.hook("deleted", (path) => {
      deletedPaths.push(path);
    });

    const stored = await disk.put("bye.txt", "bye");
    await disk.delete("bye.txt");

    expect(deletedPaths.includes(stored.href)).toBeTruthy();
  });
});
