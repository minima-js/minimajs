import { describe, test, expect } from "@jest/globals";
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

    expect(snapshotFile.startsWith("snapshots/")).toBeTruthy();
    expect(snapshotFile.endsWith(".zip")).toBeTruthy();
    expect(await dest.exists(snapshotFile)).toBe(true);
  });

  test("snapshot uses custom prefix option", async () => {
    const src = createDisk({ driver: createMemoryDriver() });
    const dest = createDisk({ driver: createMemoryDriver() });

    await src.put("file.txt", "data");

    const snapshotFile = await snapshot(src, dest, { prefix: "backups/" });

    expect(snapshotFile.startsWith("backups/")).toBeTruthy();
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

    expect(files.length).toBe(2);
    expect(files.some((f) => f.endsWith("a.jpg"))).toBeTruthy();
    expect(files.some((f) => f.endsWith("b.jpg"))).toBeTruthy();
    expect(files.some((f) => f.endsWith("readme.txt"))).toBeFalsy();
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
    expect(hello).toBeTruthy();
    expect(await hello!.text()).toBe("hello world");

    const deep = await target.get("nested/deep.txt");
    expect(deep).toBeTruthy();
    expect(await deep!.text()).toBe("deep value");
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

    expect(files.some((f) => f.includes("restored"))).toBeTruthy();
    expect(await target.exists("file.txt")).toBe(false);
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
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("existing version");
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
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("new version");
  });

  test("throws when snapshot file is not found", async () => {
    const src = createDisk({ driver: createMemoryDriver() });

    await expect(restore("snapshots/nonexistent.zip", src)).rejects.toThrow("Snapshot not found: snapshots/nonexistent.zip");
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
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("content");
  });
});
