import { describe, test, expect } from "@jest/globals";
import { createHash } from "node:crypto";
import { createDisk, text2stream } from "../index.js";
import { createMemoryDriver } from "../adapters/memory.js";
import { atomicWrite } from "../plugins/atomic-write/index.js";
import { partition } from "../plugins/partition/index.js";
import { checksum, ChecksumMismatchError } from "../plugins/checksum/index.js";
import { storeAs } from "../plugins/store-as/index.js";

// ---------------------------------------------------------------------------
// atomicWrite
// ---------------------------------------------------------------------------

describe("atomicWrite plugin", () => {
  test("stores file at the original path", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, atomicWrite());

    const stored = await disk.put("important.json", '{"ok":true}');

    expect(stored.href.endsWith("important.json")).toBeTruthy();
    expect(await disk.exists("important.json")).toBe(true);
  });

  test("temp file is cleaned up after put", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, atomicWrite({ tempPrefix: ".tmp/" }));

    await disk.put("data.txt", "hello");

    const files: string[] = [];
    for await (const f of disk.list()) {
      files.push(f.href);
    }
    // Only the final file should exist — no temp file
    expect(files.length).toBe(1);
    expect(files[0]!.startsWith(".tmp/")).toBeFalsy();
  });

  test("supports a custom tempPrefix", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, atomicWrite({ tempPrefix: ".staging/" }));

    const stored = await disk.put("output.txt", "value");
    expect(stored.href.endsWith("output.txt")).toBeTruthy();
  });

  test("file content is preserved after atomic move", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, atomicWrite());

    await disk.put("config.json", '{"version":2}');

    const file = await disk.get("config.json");
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe('{"version":2}');
  });

  test("cleans temp file when final atomic move fails", async () => {
    const driver = createMemoryDriver();
    driver.move = async () => {
      throw new Error("move failed");
    };
    const disk = createDisk({ driver }, atomicWrite({ tempPrefix: ".tmp/" }));

    await expect(disk.put("broken.txt", "payload")).rejects.toThrow("move failed");
    expect(await disk.exists("broken.txt")).toBe(false);

    const files: string[] = [];
    for await (const f of disk.list()) files.push(f.href);
    expect(files.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// partition
// ---------------------------------------------------------------------------

describe("partition plugin — hash strategy", () => {
  test("stores file under hash-derived subdirectory", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, partition({ by: "hash" }));

    await disk.put("avatar.jpg", "img data");

    const hash = createHash("sha256").update("avatar.jpg").digest("hex");
    const expectedPrefix = `${hash.slice(0, 2)}/${hash.slice(2, 4)}`;

    const files: string[] = [];
    for await (const f of disk.list()) files.push(f.href);

    expect(files.length).toBe(1);
    expect(files[0]!.startsWith(expectedPrefix)).toBeTruthy();
    expect(files[0]!.endsWith("avatar.jpg")).toBeTruthy();
  });

  test("custom levels and charsPerLevel", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, partition({ by: "hash", levels: 1, charsPerLevel: 4 }));

    await disk.put("report.pdf", "pdf data");

    const hash = createHash("sha256").update("report.pdf").digest("hex");
    const expectedPrefix = hash.slice(0, 4); // 1 level, 4 chars

    const files: string[] = [];
    for await (const f of disk.list()) files.push(f.href);

    expect(files.length).toBe(1);
    expect(files[0]!.startsWith(expectedPrefix)).toBeTruthy();
  });

  test("preserves directory prefix from original path", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, partition({ by: "hash" }));

    await disk.put("uploads/photo.jpg", "photo");

    const hash = createHash("sha256").update("uploads/photo.jpg").digest("hex");
    const hashPrefix = `${hash.slice(0, 2)}/${hash.slice(2, 4)}`;

    const files: string[] = [];
    for await (const f of disk.list()) files.push(f.href);

    expect(files.length).toBe(1);
    // Directory prefix comes first, then hash prefix, then filename
    expect(files[0]!.startsWith(`uploads/${hashPrefix}`)).toBeTruthy();
    expect(files[0]!.endsWith("photo.jpg")).toBeTruthy();
  });

  test("original path no longer exists", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, partition({ by: "hash" }));

    await disk.put("doc.txt", "content");

    expect(await disk.exists("doc.txt")).toBe(false);
  });
});

describe("partition plugin — date strategy", () => {
  test("stores file under date-derived subdirectory", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, partition({ by: "date" }));

    await disk.put("upload.png", "png data");

    const files: string[] = [];
    for await (const f of disk.list()) files.push(f.href);

    expect(files.length).toBe(1);
    // Default dateFormat is yyyy/MM/dd
    expect(files[0]).toMatch(/^\d{4}\/\d{2}\/\d{2}\/upload\.png$/);
  });

  test("supports custom dateFormat", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, partition({ by: "date", dateFormat: "yyyy/MM" }));

    await disk.put("log.txt", "log");

    const files: string[] = [];
    for await (const f of disk.list()) files.push(f.href);

    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^\d{4}\/\d{2}\/log\.txt$/);
  });
});

// ---------------------------------------------------------------------------
// checksum
// ---------------------------------------------------------------------------

describe("checksum plugin", () => {
  test("writes a sidecar file alongside the stored file", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, checksum());

    const stored = await disk.put("data.json", '{"value":1}');

    // Sidecar should exist directly in the driver
    const sidecar = (await driver.get(`${stored.href}.sha256`))!;
    expect(sidecar).toBeTruthy();

    const [stream] = sidecar;
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const digest = new TextDecoder().decode(Buffer.concat(chunks));
    // SHA-256 hex is 64 chars
    expect(digest.length).toBe(64);
  });

  test("reading a file with an intact checksum succeeds", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, checksum());

    await disk.put("intact.txt", "verified content");

    const file = await disk.get("intact.txt");
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("verified content");
  });

  test("reading a tampered file throws ChecksumMismatchError", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, checksum());

    const stored = await disk.put("secure.txt", "original content");

    // Overwrite the stored file directly in the driver (bypassing checksum hook)
    await driver.put(stored.href, text2stream("tampered content"), {});

    const file = await disk.get("secure.txt");
    expect(file).toBeTruthy();

    await expect(file!.text()).rejects.toMatchObject({ name: "ChecksumMismatchError" });
  });

  test("deleting a file also removes its sidecar", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, checksum());

    const stored = await disk.put("to-delete.txt", "bye");
    const sidecarKey = `${stored.href}.sha256`;

    expect(await driver.exists(sidecarKey)).toBeTruthy();

    await disk.delete("to-delete.txt");

    expect(await driver.exists(sidecarKey)).toBe(false);
  });

  test("supports custom algorithm and extension", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, checksum({ algorithm: "md5", extension: ".md5" }));

    const stored = await disk.put("file.bin", "some bytes");

    const sidecar = (await driver.get(`${stored.href}.md5`))!;
    expect(sidecar).toBeTruthy();

    const [stream] = sidecar;
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const digest = new TextDecoder().decode(Buffer.concat(chunks));
    // MD5 hex is 32 chars
    expect(digest.length).toBe(32);
  });

  test("ChecksumMismatchError includes path, expected, and actual", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, checksum());

    const stored = await disk.put("check.txt", "good");
    await driver.put(stored.href, text2stream("bad"), {});

    const file = await disk.get("check.txt");
    expect(file).toBeTruthy();

    try {
      await file!.text();
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err instanceof ChecksumMismatchError).toBeTruthy();
      expect(err.name).toBe("ChecksumMismatchError");
      expect(err.path).toBe(stored.href);
      expect(err.expected).toBeTruthy();
      expect(err.actual).toBeTruthy();
      expect(err.expected).not.toBe(err.actual);
    }
  });
});

// ---------------------------------------------------------------------------
// storeAs
// ---------------------------------------------------------------------------

describe("storeAs plugin", () => {
  test("uuid strategy generates a UUID-based filename", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, storeAs("uuid"));

    const file = new File(["content"], "photo.jpg", { type: "image/jpeg" });
    const stored = await disk.put(file);

    // filename should be UUID + .jpg, not the original "photo.jpg"
    expect(stored.name !== "photo.jpg").toBeTruthy();
    expect(stored.name.endsWith(".jpg")).toBeTruthy();
    // UUID is 36 chars; uuid + ext = 36 + 4 = 40
    expect(stored.name).toMatch(/^[0-9a-f-]{36}\.jpg$/);
  });

  test("uuid-original strategy prefixes UUID before the original name", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, storeAs("uuid-original"));

    const file = new File(["data"], "document.pdf");
    const stored = await disk.put(file);

    expect(stored.name).toMatch(/^[0-9a-f-]{36}-document\.pdf$/);
  });

  test("custom generator function is called with the File", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk(
      { driver },
      storeAs((f) => `custom-${f.name}`)
    );

    const file = new File(["data"], "note.txt");
    const stored = await disk.put(file);

    expect(stored.name).toBe("custom-note.txt");
  });

  test("async custom generator is supported", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk(
      { driver },
      storeAs(async (f) => `async-${f.name}`)
    );

    const file = new File(["data"], "report.csv");
    const stored = await disk.put(file);

    expect(stored.name).toBe("async-report.csv");
  });

  test("originalName is preserved in metadata when name changes", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, storeAs("uuid"));

    const file = new File(["img"], "original.png");
    const stored = await disk.put(file);

    expect(stored.metadata.originalName).toBe("original.png");
  });

  test("no-op when a string path is passed (not a File)", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, storeAs("uuid"));

    const stored = await disk.put("explicit-name.txt", "content");

    expect(stored.name.endsWith("explicit-name.txt")).toBeTruthy();
  });

  test("default strategy is uuid", async () => {
    const driver = createMemoryDriver();
    // storeAs() with no argument defaults to "uuid"
    const disk = createDisk({ driver }, storeAs());

    const file = new File(["x"], "img.webp");
    const stored = await disk.put(file);

    expect(stored.name !== "img.webp").toBeTruthy();
    expect(stored.name.endsWith(".webp")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Plugin composition
// ---------------------------------------------------------------------------

describe("plugin composition", () => {
  test("atomicWrite + checksum — file is stored atomically with integrity", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, atomicWrite(), checksum());

    await disk.put("composed.txt", "composed content");

    expect(await disk.exists("composed.txt")).toBe(true);

    const file = await disk.get("composed.txt");
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("composed content");
  });

  test("storeAs + partition — file is renamed and partitioned", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, storeAs("uuid"), partition({ by: "hash" }));

    const original = new File(["data"], "my-file.txt");
    const stored = await disk.put(original);

    // The stored name is a UUID.txt, and it's under a hash partition
    expect(stored.name !== "my-file.txt").toBeTruthy();
    expect(stored.name.endsWith(".txt")).toBeTruthy();

    const files: string[] = [];
    for await (const f of disk.list()) files.push(f.href);
    expect(files.length).toBe(1);
  });
});
