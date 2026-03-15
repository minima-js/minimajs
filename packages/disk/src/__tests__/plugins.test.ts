import { describe, test, expect } from "@jest/globals";
import { createHash } from "node:crypto";
import { createDisk } from "../index.js";
import { createMemoryDriver } from "../adapters/memory.js";
import { atomicWrite } from "../plugins/atomic-write/index.js";
import { partition } from "../plugins/partition/index.js";
import { checksum, ChecksumMismatchError } from "../plugins/checksum/index.js";
import { storeAs } from "../plugins/store-as/index.js";
import { compression } from "../plugins/compression/index.js";
import { encryption } from "../plugins/encryption/index.js";
import { uploadProgress, downloadProgress } from "../plugins/progress/index.js";
import type { UploadProgress } from "../plugins/progress/upload.js";
import type { DownloadProgress } from "../plugins/progress/download.js";
import { text2stream } from "../helpers.js";

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

describe("partition plugin — custom generator", () => {
  test("custom function receives path and its return is used as prefix", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk(
      { driver },
      partition((path) => `custom/${path.split(".").pop()}`)
    );

    await disk.put("avatar.jpg", "img");

    const files: string[] = [];
    for await (const f of disk.list()) files.push(f.href);

    expect(files.length).toBe(1);
    expect(files[0]).toBe("custom/jpg/avatar.jpg");
  });

  test("async custom generator is supported", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk(
      { driver },
      partition(async (_path, _data, opts) => (opts.type?.startsWith("image/") ? "images" : "files"))
    );

    await disk.put("photo.jpg", new Blob(["img"], { type: "image/jpeg" }), { type: "image/jpeg" });
    await disk.put("doc.txt", "text");

    const files: string[] = [];
    for await (const f of disk.list()) files.push(f.href);

    expect(files.some((f) => f.startsWith("images/"))).toBe(true);
    expect(files.some((f) => f.startsWith("files/"))).toBe(true);
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
    // Default format is yyyy/MM/dd
    expect(files[0]).toMatch(/^\d{4}\/\d{2}\/\d{2}\/upload\.png$/);
  });

  test("supports custom format", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, partition({ by: "month" }));

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
    const sidecar = (await driver.get(`${stored.href}.sha256`, {}))!;
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

    expect(await driver.exists(sidecarKey, {})).toBeTruthy();

    await disk.delete("to-delete.txt");

    expect(await driver.exists(sidecarKey, {})).toBe(false);
  });

  test("supports custom algorithm and extension", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, checksum({ algorithm: "md5", extension: ".md5" }));

    const stored = await disk.put("file.bin", "some bytes");

    const sidecar = (await driver.get(`${stored.href}.md5`, {}))!;
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

// ---------------------------------------------------------------------------
// compression plugin
// ---------------------------------------------------------------------------

describe("compression plugin", () => {
  test("transparently compresses and decompresses a file (gzip roundtrip)", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, compression());

    await disk.put("file.txt", "hello compression");

    const file = await disk.get("file.txt");
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("hello compression");
  });

  test("raw bytes stored in driver are compressed (not plain text)", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, compression());

    await disk.put("data.txt", "hello compression");

    const raw = await driver.get("data.txt", {});
    expect(raw).toBeTruthy();
    const [stream] = raw!;
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const rawText = new TextDecoder().decode(Buffer.concat(chunks));
    expect(rawText).not.toBe("hello compression");
  });

  test("stores algorithm in metadata when driver supports it", async () => {
    const driver = createMemoryDriver(); // capabilities.metadata = true
    const disk = createDisk({ driver }, compression());

    await disk.put("meta.txt", "content");

    const metadata = await driver.metadata("meta.txt", {});
    expect(metadata?.metadata?.["x-compression"]).toBe("gzip");
  });

  test("supports custom algorithm (deflate-raw roundtrip)", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, compression({ algorithm: "deflate-raw" }));

    await disk.put("deflated.txt", "deflated content");

    const file = await disk.get("deflated.txt");
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("deflated content");
  });

  test("does not decompress files that lack the x-compression metadata flag", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, compression());

    // Write a plain (uncompressed) file directly to the driver — no metadata flag
    await driver.put("plain.txt", text2stream("plain text"), { type: "text/plain" });

    // disk.get should return it as-is (no x-compression key => getAlgo returns undefined)
    const file = await disk.get("plain.txt");
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("plain text");
  });
});

// ---------------------------------------------------------------------------
// encryption plugin
// ---------------------------------------------------------------------------

describe("encryption plugin", () => {
  test("throws DiskConfigError when driver has no metadata support", () => {
    const driver = createMemoryDriver();
    // Create a driver variant that reports no metadata capability
    const noMetaDriver = Object.create(driver, {
      capabilities: { value: { metadata: false }, configurable: true },
    });

    expect(() => createDisk({ driver: noMetaDriver }, encryption({ password: "secret" }))).toThrow(
      expect.objectContaining({ name: "DiskConfigError" })
    );
  });

  test("transparently encrypts and decrypts a file (AES-256-GCM roundtrip)", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, encryption({ password: "test-password" }));

    await disk.put("secret.txt", "sensitive data");

    const file = await disk.get("secret.txt");
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("sensitive data");
  });

  test("raw bytes stored in driver are encrypted (not readable as plaintext)", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, encryption({ password: "test-password" }));

    await disk.put("encrypted.txt", "plaintext content");

    const raw = await driver.get("encrypted.txt", {});
    expect(raw).toBeTruthy();
    const [stream] = raw!;
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const rawText = new TextDecoder().decode(Buffer.concat(chunks));
    expect(rawText).not.toContain("plaintext content");
  });

  test("marks file with encryption flag in driver metadata", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, encryption({ password: "test-password" }));

    await disk.put("flagged.txt", "data");

    const metadata = await driver.metadata("flagged.txt", {});
    expect(metadata?.metadata?.["x-minimajs-encrypt"]).toBeTruthy();
  });

  test("does not decrypt files that lack the encryption flag", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver }, encryption({ password: "test-password" }));

    // Write a plain file directly to the driver (no x-minimajs-encrypt metadata)
    await driver.put("unencrypted.txt", text2stream("raw content"), { type: "text/plain" });

    const file = await disk.get("unencrypted.txt");
    expect(file).toBeTruthy();
    expect(await file!.text()).toBe("raw content");
  });
});

// ---------------------------------------------------------------------------
// progress plugins
// ---------------------------------------------------------------------------

describe("uploadProgress plugin", () => {
  test("calls onProgress as bytes are uploaded", async () => {
    const driver = createMemoryDriver();
    const progress: UploadProgress[] = [];
    const disk = createDisk(
      { driver },
      uploadProgress((p) => progress.push({ ...p }))
    );

    await disk.put("upload.txt", "hello upload progress");

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]!.loaded).toBeGreaterThan(0);
  });

  test("reports total and percentage when size is known (Blob input)", async () => {
    const driver = createMemoryDriver();
    const progress: UploadProgress[] = [];
    const disk = createDisk(
      { driver },
      uploadProgress((p) => progress.push({ ...p }))
    );

    const content = "sized content";
    const blob = new Blob([content], { type: "text/plain" });
    await disk.put("sized.txt", blob, { type: "text/plain" });

    const last = progress[progress.length - 1]!;
    expect(last.total).toBeDefined();
    expect(last.percentage).toBeCloseTo(100);
  });

  test("percentage is undefined when size is not known (string input)", async () => {
    const driver = createMemoryDriver();
    const progress: UploadProgress[] = [];
    const disk = createDisk(
      { driver },
      uploadProgress((p) => progress.push({ ...p }))
    );

    // String data: size is not passed via options, so total stays undefined
    await disk.put("unknown.txt", "content without size");

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[0]!.percentage).toBeUndefined();
  });

  test("loaded increases monotonically across chunks", async () => {
    const driver = createMemoryDriver();
    const progress: UploadProgress[] = [];
    const disk = createDisk(
      { driver },
      uploadProgress((p) => progress.push({ ...p }))
    );

    const blob = new Blob(["chunk one", "chunk two"], { type: "text/plain" });
    await disk.put("chunks.txt", blob);

    for (let i = 1; i < progress.length; i++) {
      expect(progress[i]!.loaded).toBeGreaterThanOrEqual(progress[i - 1]!.loaded);
    }
  });
});

describe("downloadProgress plugin", () => {
  test("calls onProgress as bytes are downloaded", async () => {
    const driver = createMemoryDriver();
    const progress: DownloadProgress[] = [];
    const disk = createDisk(
      { driver },
      downloadProgress((p) => progress.push({ ...p }))
    );

    await disk.put("download.txt", "hello download progress");

    const file = await disk.get("download.txt");
    expect(file).toBeTruthy();
    await file!.text(); // consume stream to trigger progress callbacks

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]!.loaded).toBeGreaterThan(0);
  });

  test("reports total and percentage when file size is known", async () => {
    const driver = createMemoryDriver();
    const progress: DownloadProgress[] = [];
    const disk = createDisk(
      { driver },
      downloadProgress((p) => progress.push({ ...p }))
    );

    await disk.put("dl-sized.txt", "sized download content");

    const file = await disk.get("dl-sized.txt");
    expect(file).toBeTruthy();
    await file!.text();

    const last = progress[progress.length - 1]!;
    expect(last.total).toBeDefined();
    expect(last.percentage).toBeCloseTo(100);
  });

  test("loaded increases monotonically", async () => {
    const driver = createMemoryDriver();
    const progress: DownloadProgress[] = [];
    const disk = createDisk(
      { driver },
      downloadProgress((p) => progress.push({ ...p }))
    );

    await disk.put("dl-mono.txt", "monotonic download content here");

    const file = await disk.get("dl-mono.txt");
    await file!.text();

    for (let i = 1; i < progress.length; i++) {
      expect(progress[i]!.loaded).toBeGreaterThanOrEqual(progress[i - 1]!.loaded);
    }
  });
});

// ---------------------------------------------------------------------------
// put:failed / get:failed / delete:failed hooks
// ---------------------------------------------------------------------------

describe("put:failed / get:failed / delete:failed hooks", () => {
  test("put:failed fires when driver.put throws", async () => {
    const driver = createMemoryDriver();
    driver.put = async () => {
      throw new Error("storage unavailable");
    };

    const errors: unknown[] = [];
    const disk = createDisk({ driver });
    disk.hook("put:failed", (err) => {
      errors.push(err);
      throw err;
    });

    await expect(disk.put("file.txt", "data")).rejects.toThrow("storage unavailable");
    expect(errors.length).toBe(1);
  });

  test("put:failed receives the transformed path (atomicWrite temp path)", async () => {
    const driver = createMemoryDriver();
    driver.put = async () => {
      throw new Error("put failed");
    };

    let receivedPath: string | undefined;
    const disk = createDisk({ driver }, atomicWrite({ tempPrefix: ".tmp/" }));
    disk.hook("put:failed", (err, path) => {
      receivedPath = path;
      throw err;
    });

    await expect(disk.put("final.txt", "content")).rejects.toThrow();
    // atomicWrite transforms path to a temp path before driver.put
    expect(receivedPath?.startsWith(".tmp/")).toBe(true);
  });

  test("put:failed hooks chain — each hook sees the error thrown by the previous (LIFO)", async () => {
    const driver = createMemoryDriver();
    driver.put = async () => {
      throw new Error("original");
    };

    const seen: string[] = [];
    const disk = createDisk({ driver });

    // Registered first → runs second (LIFO)
    disk.hook("put:failed", (err) => {
      seen.push(`hook1: ${(err as Error).message}`);
      throw err;
    });
    // Registered second → runs first (LIFO)
    disk.hook("put:failed", (err) => {
      seen.push(`hook2: ${(err as Error).message}`);
      throw new Error("wrapped");
    });

    await expect(disk.put("file.txt", "data")).rejects.toThrow("wrapped");
    expect(seen).toEqual(["hook2: original", "hook1: wrapped"]);
  });

  test("get:failed fires when driver.get throws", async () => {
    const driver = createMemoryDriver();
    driver.get = async () => {
      throw new Error("read error");
    };

    const errors: unknown[] = [];
    const disk = createDisk({ driver });
    disk.hook("get:failed", (err) => {
      errors.push(err);
      throw err;
    });

    await expect(disk.get("file.txt")).rejects.toThrow("read error");
    expect(errors.length).toBe(1);
  });

  test("get:failed receives the resolved path", async () => {
    const driver = createMemoryDriver();
    driver.get = async (path) => {
      throw new Error(`cannot read ${path}`);
    };

    let receivedPath: string | undefined;
    const disk = createDisk({ driver });
    disk.hook("get:failed", (err, path) => {
      receivedPath = path;
      throw err;
    });

    await expect(disk.get("docs/readme.txt")).rejects.toThrow();
    expect(receivedPath).toBe("docs/readme.txt");
  });

  test("delete:failed fires when driver.delete throws", async () => {
    const driver = createMemoryDriver();
    driver.delete = async () => {
      throw new Error("delete error");
    };

    const errors: unknown[] = [];
    const disk = createDisk({ driver });
    disk.hook("delete:failed", (err) => {
      errors.push(err);
      throw err;
    });

    await expect(disk.delete("any.txt")).rejects.toThrow("delete error");
    expect(errors.length).toBe(1);
  });

  test("delete:failed receives the resolved href", async () => {
    const driver = createMemoryDriver();
    driver.delete = async (href) => {
      throw new Error(`cannot delete ${href}`);
    };

    let receivedHref: string | undefined;
    const disk = createDisk({ driver });
    disk.hook("delete:failed", (err, href) => {
      receivedHref = href;
      throw err;
    });

    await expect(disk.delete("uploads/photo.jpg")).rejects.toThrow();
    expect(receivedHref).toBe("uploads/photo.jpg");
  });

  test("error propagates unchanged when no failed hooks are registered", async () => {
    const driver = createMemoryDriver();
    driver.put = async () => {
      throw new Error("raw driver error");
    };

    const disk = createDisk({ driver });

    await expect(disk.put("file.txt", "data")).rejects.toThrow("raw driver error");
  });
});
