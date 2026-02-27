/**
 * Tests for cross-disk File operations — copying/moving DiskFile instances
 * between separate Disk instances (different drivers).
 */
import { describe, test } from "@jest/globals";
import assert from "node:assert/strict";
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
    assert.ok(sourceFile);

    const copied = await diskB.copy(sourceFile);

    assert.ok(await diskB.exists(copied.name));
    const retrieved = await diskB.get(copied.name);
    assert.ok(retrieved);
    assert.equal(await retrieved.text(), "cross-disk content");
  });

  test("original file remains on source disk after cross-disk copy", async () => {
    const diskA = makeDisk();
    const diskB = makeDisk();

    await diskA.put("original.txt", "keep me");
    const sourceFile = await diskA.get("original.txt");
    assert.ok(sourceFile);

    await diskB.copy(sourceFile);

    assert.equal(await diskA.exists("original.txt"), true);
  });

  test("cross-disk copy with explicit target path", async () => {
    const diskA = makeDisk();
    const diskB = makeDisk();

    await diskA.put("file.txt", "hello");
    const sourceFile = await diskA.get("file.txt");
    assert.ok(sourceFile);

    const copied = await diskB.copy(sourceFile, "renamed.txt");

    assert.equal(copied.name, "renamed.txt");
    assert.equal(await diskB.exists("renamed.txt"), true);
  });

  test("same-disk copy with DiskFile requires explicit target path", async () => {
    const disk = makeDisk();

    await disk.put("file.txt", "data");
    const file = await disk.get("file.txt");
    assert.ok(file);

    await assert.rejects(() => disk.copy(file), {
      message: /Explicit target path required/,
    });
  });

  test("same-disk copy with DiskFile and explicit target", async () => {
    const disk = makeDisk();

    await disk.put("file.txt", "data");
    const file = await disk.get("file.txt");
    assert.ok(file);

    const copied = await disk.copy(file, "copy.txt");

    assert.ok(copied.name.endsWith("copy.txt"));
    assert.equal(await disk.exists("file.txt"), true);
    assert.equal(await disk.exists("copy.txt"), true);
  });
});

describe("cross-disk move", () => {
  test("moves a DiskFile from one disk to another", async () => {
    const diskA = makeDisk();
    const diskB = makeDisk();

    await diskA.put("move-me.txt", "move content");
    const sourceFile = await diskA.get("move-me.txt");
    assert.ok(sourceFile);

    const moved = await diskB.move(sourceFile);

    // File should exist on diskB
    assert.ok(await diskB.exists(moved.name));

    // File should be deleted from diskA
    assert.equal(await diskA.exists("move-me.txt"), false);
  });

  test("cross-disk move with explicit target path", async () => {
    const diskA = makeDisk();
    const diskB = makeDisk();

    await diskA.put("src.txt", "payload");
    const sourceFile = await diskA.get("src.txt");
    assert.ok(sourceFile);

    const moved = await diskB.move(sourceFile, "dest.txt");

    assert.equal(moved.name, "dest.txt");
    assert.equal(await diskB.exists("dest.txt"), true);
    assert.equal(await diskA.exists("src.txt"), false);
  });

  test("same-disk move with DiskFile requires explicit target path", async () => {
    const disk = makeDisk();

    await disk.put("file.txt", "data");
    const file = await disk.get("file.txt");
    assert.ok(file);

    await assert.rejects(() => disk.move(file), {
      message: /Explicit target path required/,
    });
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

    assert.equal(hrefs.length, 3);
  });

  test("returns empty iterator when disk has no files", async () => {
    const disk = makeDisk();

    const files: string[] = [];
    for await (const file of disk) {
      files.push(file.href);
    }

    assert.equal(files.length, 0);
  });
});

describe("DiskFile", () => {
  test("text() returns string content", async () => {
    const disk = makeDisk();
    await disk.put("text.txt", "hello world");
    const file = await disk.get("text.txt");
    assert.ok(file);
    assert.equal(await file.text(), "hello world");
  });

  test("arrayBuffer() returns content as ArrayBuffer", async () => {
    const disk = makeDisk();
    await disk.put("buf.bin", "binary");
    const file = await disk.get("buf.bin");
    assert.ok(file);
    const buf = await file.arrayBuffer();
    assert.ok(buf instanceof ArrayBuffer);
    assert.equal(new TextDecoder().decode(buf), "binary");
  });

  test("bytes() returns Uint8Array", async () => {
    const disk = makeDisk();
    await disk.put("bytes.bin", "data");
    const file = await disk.get("bytes.bin");
    assert.ok(file);
    const bytes = await file.bytes();
    assert.ok(bytes instanceof Uint8Array);
    assert.equal(new TextDecoder().decode(bytes), "data");
  });

  test("bytes() caches the result on repeated calls", async () => {
    const disk = makeDisk();
    await disk.put("cached.txt", "content");
    const file = await disk.get("cached.txt");
    assert.ok(file);
    const first = await file.bytes();
    const second = await file.bytes();
    assert.ok(first === second, "should return the same cached Uint8Array instance");
  });

  test("stream() returns a ReadableStream", async () => {
    const disk = makeDisk();
    await disk.put("stream.txt", "streamed");
    const file = await disk.get("stream.txt");
    assert.ok(file);
    const stream = file.stream();
    assert.ok(stream instanceof ReadableStream);
  });

  test("size reflects stored byte length", async () => {
    const disk = makeDisk();
    await disk.put("sized.txt", "12345");
    const file = await disk.get("sized.txt");
    assert.ok(file);
    assert.equal(file.size, 5);
  });

  test("href is set correctly", async () => {
    const disk = makeDisk();
    const stored = await disk.put("named.txt", "x");
    assert.ok(stored.href.endsWith("named.txt"));
  });
});

describe("hooks API", () => {
  test("hook() registers a handler and returns an unsubscribe function", async () => {
    const disk = makeDisk();
    const calls: string[] = [];

    const unsubscribe = disk.hook("put", (path, data, opts) => {
      calls.push(path);
    });

    await disk.put("tracked.txt", "data");
    assert.ok(calls.includes("tracked.txt"));

    // After unsubscribing, the hook should not be called
    unsubscribe();
    await disk.put("untracked.txt", "data");
    assert.ok(!calls.includes("untracked.txt"));
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
    assert.ok(seen.includes("early.txt"));
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
    assert.ok(stored.href.includes("prefixed/file.txt"), `got: ${stored.href}`);
  });

  test("stored hook receives the final DiskFile", async () => {
    const disk = makeDisk();
    const storedHrefs: string[] = [];

    disk.hook("stored", (file) => {
      storedHrefs.push(file.href);
    });

    await disk.put("tracked.txt", "value");
    assert.equal(storedHrefs.length, 1);
    assert.ok(storedHrefs[0].endsWith("tracked.txt"));
  });

  test("deleted hook fires with the deleted file href", async () => {
    const disk = makeDisk();
    const deletedPaths: string[] = [];

    disk.hook("deleted", (path) => {
      deletedPaths.push(path);
    });

    const stored = await disk.put("bye.txt", "bye");
    await disk.delete("bye.txt");

    assert.ok(deletedPaths.includes(stored.href));
  });
});
