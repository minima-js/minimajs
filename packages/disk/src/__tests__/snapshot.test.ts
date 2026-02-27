import { describe, test } from "@jest/globals";
import assert from "node:assert/strict";
import { createDisk } from "../index.js";
import { createMemoryDriver } from "../adapters/memory.js";
import { snapshot, restore } from "../snapshot.js";

describe("snapshot", () => {
  test("creates a zip file on the destination disk", async () => {
    const src = createDisk({ driver: createMemoryDriver() });
    const dest = createDisk({ driver: createMemoryDriver() });

    await src.put("a.txt", "content a");
    await src.put("b.txt", "content b");

    const snapshotFile = await snapshot(src, dest);

    assert.ok(snapshotFile.startsWith("snapshots/"), `expected snapshots/ prefix, got: ${snapshotFile}`);
    assert.ok(snapshotFile.endsWith(".zip"), `expected .zip suffix, got: ${snapshotFile}`);
    assert.equal(await dest.exists(snapshotFile), true);
  });

  test("snapshot uses custom prefix option", async () => {
    const src = createDisk({ driver: createMemoryDriver() });
    const dest = createDisk({ driver: createMemoryDriver() });

    await src.put("file.txt", "data");

    const snapshotFile = await snapshot(src, dest, { prefix: "backups/" });

    assert.ok(snapshotFile.startsWith("backups/"), `expected backups/ prefix, got: ${snapshotFile}`);
  });

  test("snapshot only includes files under the given path", async () => {
    const srcDriver = createMemoryDriver();
    const src = createDisk({ driver: srcDriver });
    const dest = createDisk({ driver: createMemoryDriver() });

    await src.put("images/a.jpg", "img a");
    await src.put("images/b.jpg", "img b");
    await src.put("docs/readme.txt", "readme");

    const snapshotFile = await snapshot(src, dest, { path: "images" });

    // Restore the snapshot and verify only images are present
    const target = createDisk({ driver: createMemoryDriver() });
    await restore(snapshotFile, dest, target);

    const files: string[] = [];
    for await (const f of target.list()) files.push(f.href);

    assert.equal(files.length, 2, `expected 2 files, got: ${files.join(", ")}`);
    assert.ok(files.some((f) => f.endsWith("a.jpg")));
    assert.ok(files.some((f) => f.endsWith("b.jpg")));
    assert.ok(!files.some((f) => f.endsWith("readme.txt")));
  });
});

describe("restore", () => {
  test("restores all files from a snapshot", async () => {
    const src = createDisk({ driver: createMemoryDriver() });
    const dest = createDisk({ driver: createMemoryDriver() });

    await src.put("hello.txt", "hello world");
    await src.put("nested/deep.txt", "deep value");

    const snapshotFile = await snapshot(src, dest);

    const target = createDisk({ driver: createMemoryDriver() });
    await restore(snapshotFile, dest, target);

    const hello = await target.get("hello.txt");
    assert.ok(hello, "hello.txt should be restored");
    assert.equal(await hello.text(), "hello world");

    const deep = await target.get("nested/deep.txt");
    assert.ok(deep, "nested/deep.txt should be restored");
    assert.equal(await deep.text(), "deep value");
  });

  test("restores to a different target path with targetPath option", async () => {
    const src = createDisk({ driver: createMemoryDriver() });
    const dest = createDisk({ driver: createMemoryDriver() });

    await src.put("file.txt", "original");

    const snapshotFile = await snapshot(src, dest);

    const target = createDisk({ driver: createMemoryDriver() });
    await restore(snapshotFile, dest, target, { targetPath: "restored" });

    const files: string[] = [];
    for await (const f of target.list()) files.push(f.href);

    assert.ok(files.some((f) => f.includes("restored")), `expected restored/ prefix, got: ${files.join(", ")}`);
    assert.equal(await target.exists("file.txt"), false, "should NOT be at original path");
  });

  test("does not overwrite existing files when overwrite is false (default)", async () => {
    const src = createDisk({ driver: createMemoryDriver() });
    const dest = createDisk({ driver: createMemoryDriver() });

    await src.put("shared.txt", "snapshot version");

    const snapshotFile = await snapshot(src, dest);

    const target = createDisk({ driver: createMemoryDriver() });
    // Pre-populate the target with a different version
    await target.put("shared.txt", "existing version");

    await restore(snapshotFile, dest, target, { overwrite: false });

    const file = await target.get("shared.txt");
    assert.ok(file);
    assert.equal(await file.text(), "existing version", "existing file should not be overwritten");
  });

  test("overwrites existing files when overwrite is true", async () => {
    const src = createDisk({ driver: createMemoryDriver() });
    const dest = createDisk({ driver: createMemoryDriver() });

    await src.put("overwrite.txt", "new version");

    const snapshotFile = await snapshot(src, dest);

    const target = createDisk({ driver: createMemoryDriver() });
    await target.put("overwrite.txt", "old version");

    await restore(snapshotFile, dest, target, { overwrite: true });

    const file = await target.get("overwrite.txt");
    assert.ok(file);
    assert.equal(await file.text(), "new version", "file should be overwritten");
  });

  test("throws when snapshot file is not found", async () => {
    const src = createDisk({ driver: createMemoryDriver() });

    await assert.rejects(() => restore("snapshots/nonexistent.zip", src), {
      message: "Snapshot not found: snapshots/nonexistent.zip",
    });
  });

  test("restores to same disk when dest is omitted", async () => {
    const disk = createDisk({ driver: createMemoryDriver() });

    await disk.put("original.txt", "content");

    // snapshot to same disk
    const snapshotFile = await snapshot(disk, disk);
    await disk.delete("original.txt");

    // restore back to same disk (no dest argument)
    await restore(snapshotFile, disk);

    const file = await disk.get("original.txt");
    assert.ok(file, "file should be restored to same disk");
    assert.equal(await file.text(), "content");
  });
});
