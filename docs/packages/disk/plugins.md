# Disk Plugins

Plugins extend `@minimajs/disk` by hooking into file operation lifecycle events. They are composable, framework-agnostic, and applied in order.

## Quick Reference

| Plugin                                  | Import                   | What it does                                               |
| --------------------------------------- | ------------------------ | ---------------------------------------------------------- |
| [`storeAs`](#storeas)                   | `@minimajs/disk/plugins` | Rename files on upload (UUID, UUID+original, custom)       |
| [`partition`](#partition)               | `@minimajs/disk/plugins` | Organize files into subdirectories (date, hash, or custom) |
| [`atomicWrite`](#atomicwrite)           | `@minimajs/disk/plugins` | Safe writes via temp-file-then-rename                      |
| [`checksum`](#checksum)                 | `@minimajs/disk/plugins` | Write + verify SHA-256 sidecar files                       |
| [`compression`](#compression)           | `@minimajs/disk/plugins` | Transparent gzip/deflate compression                       |
| [`encryption`](#encryption)             | `@minimajs/disk/plugins` | Transparent AES-256-GCM encryption                         |
| [`uploadProgress`](#uploadprogress)     | `@minimajs/disk/plugins` | Track upload byte progress                                 |
| [`downloadProgress`](#downloadprogress) | `@minimajs/disk/plugins` | Track download byte progress                               |

## Usage

Pass plugins as rest arguments to `createDisk` or `createProtoDisk`. They are applied in the order given:

Rule of thumb for ordering:

1. `storeAs` / `partition` first (determine final path and filename)
2. `compression` before `encryption` (better compression ratio)
3. integrity/atomic plugins (`checksum`, `atomicWrite`) after transforms
4. progress/logging plugins last for observability

```typescript
import { createDisk } from "@minimajs/disk";
import { storeAs, partition, atomicWrite, checksum, compression, encryption } from "@minimajs/disk/plugins";
import { createFsDriver } from "@minimajs/disk/adapters";

const disk = createDisk(
  { driver: createFsDriver({ root: "./uploads" }) },
  storeAs("uuid"),
  partition({ by: "date" }),
  compression(),
  checksum()
);
```

Plugins can also be applied after creation using the `DiskPlugin` type:

```typescript
import type { DiskPlugin } from "@minimajs/disk";

function myPlugin(): DiskPlugin {
  return (disk) => {
    disk.hook("stored", (file) => {
      console.log("stored:", file.href);
    });
  };
}
```

---

## storeAs

Automatically rename files when a `File` object is passed to `put`. Without this plugin, `put(file)` preserves the original filename (`file.name`) as-is.

```typescript
import { storeAs } from "@minimajs/disk/plugins";
```

### Strategies

#### `"uuid"` (default)

Generates a UUID filename, preserving the file extension.

```typescript
const disk = createDisk({ driver }, storeAs());
// or
const disk = createDisk({ driver }, storeAs("uuid"));

await disk.put(new File(["…"], "photo.jpg"));
// stored as: "550e8400-e29b-41d4-a716-446655440000.jpg"
```

#### `"uuid-original"`

Prepends a UUID before the original filename.

```typescript
const disk = createDisk({ driver }, storeAs("uuid-original"));

await disk.put(new File(["…"], "photo.jpg"));
// stored as: "550e8400-e29b-41d4-a716-446655440000-photo.jpg"
```

#### Custom generator

Full control over the generated name — sync or async.

```typescript
import { extname } from "node:path";
import { randomUUID } from "node:crypto";

// Year-based directory prefix
const disk = createDisk(
  { driver },
  storeAs((file) => `${new Date().getFullYear()}/${randomUUID()}${extname(file.name)}`)
);

// Async — content hash as filename
const disk = createDisk(
  { driver },
  storeAs(async (file) => {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const hex = Buffer.from(hash).toString("hex");
    return `${hex}${extname(file.name)}`;
  })
);
```

### Metadata

When the name is changed, the original filename is automatically saved in `file.metadata.originalName`:

```typescript
const uploaded = await disk.put(new File(["…"], "photo.jpg"));
console.log(uploaded.name); // "550e8400-….jpg"
console.log(uploaded.metadata.originalName); // "photo.jpg"
```

### Notes

- Only applies when `data instanceof File`. Plain `put("path", data)` calls are unaffected.
- Combine with `partition` to both rename and organize files.

---

## partition

Automatically organize files into subdirectories when stored. The filename is preserved — only a path prefix is added.

```typescript
import { partition } from "@minimajs/disk/plugins";
```

### Date-based

Groups files by upload date using built-in `Date` methods — no extra dependencies.

```typescript
// Daily buckets: 2024/01/15/avatar.jpg
const disk = createDisk({ driver }, partition({ by: "date" }));

// Monthly buckets: 2024/01/avatar.jpg
const disk = createDisk({ driver }, partition({ by: "month" }));

// Yearly buckets: 2024/avatar.jpg
const disk = createDisk({ driver }, partition({ by: "year" }));
```

### Hash-based

Groups files by a SHA-256 hash of the path. Distributes files evenly across directories — useful for filesystems that slow down with many files in one directory.

```typescript
// Default: 2 levels, 2 chars each → ab/cd/avatar.jpg
const disk = createDisk({ driver }, partition({ by: "hash" }));

// 3 levels, 3 chars each → abc/def/012/avatar.jpg
const disk = createDisk({ driver }, partition({ by: "hash", levels: 3, charsPerLevel: 3 }));
```

### Custom generator

Pass a function for full control over the prefix. Receives the same `(path, data, options)` args as the `put` hook. Sync and async are both supported.

```typescript
// File-extension based buckets
const disk = createDisk(
  { driver },
  partition((path) => `by-ext/${path.split(".").pop()}`)
);
await disk.put("photo.jpg", data);
// stored at: "by-ext/jpg/photo.jpg"

// Content-type based routing (async)
const disk = createDisk(
  { driver },
  partition(async (_path, _data, opts) => (opts.type?.startsWith("image/") ? "images" : "files"))
);

// Custom date format (hourly buckets)
const disk = createDisk(
  { driver },
  partition(() => {
    const d = new Date();
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getHours()).padStart(2, "0")}`;
  })
);
```

### Options

```typescript
// Built-in strategies
type PartitionOptions = { by: "year" | "month" | "date" } | { by: "hash"; levels?: number; charsPerLevel?: number }; // defaults: 2, 2

// Custom generator
type PartitionGenerator = (path: string, data: DiskData, opts: PutOptions) => string | Promise<string>;
```

### Notes

- Files stored under a partitioned path must be accessed using the full path (e.g., `disk.get("2024/01/15/avatar.jpg")`).
- For formats beyond `year`/`month`/`date` (e.g. hourly), use a custom generator.
- Combine with `storeAs` to both rename and partition.

---

## atomicWrite

Writes files to a temporary location first, then renames to the final path. Prevents partial or corrupted files from ever being visible to readers during a write.

```typescript
import { atomicWrite } from "@minimajs/disk/plugins";
```

```typescript
const disk = createDisk({ driver }, atomicWrite());

await disk.put("config.json", data);
// Written to ".tmp/<uuid>" first, then atomically moved to "config.json"
```

### Options

```typescript
interface AtomicWriteOptions {
  tempPrefix?: string; // default: ".tmp/"
}

const disk = createDisk({ driver }, atomicWrite({ tempPrefix: ".staging/" }));
```

### Automatic cleanup

The plugin registers a `put:failed` hook that ensures the temp file is always removed on failure — no orphaned `.tmp/` files, regardless of what went wrong:

| Failure scenario                                     | What happens                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `driver.put` throws (network error, disk full, etc.) | `put:failed` hook deletes the temp file, original path never touched |
| Rename (`move`) to final path fails                  | `stored` hook catches the error, deletes the temp file, re-throws    |

```typescript
// If this throws for any reason, ".tmp/<uuid>" is cleaned up automatically
await disk.put("config.json", data);
```

### Notes

- Best suited for filesystem drivers where rename is a native atomic OS operation.
- The original path is tracked via a Symbol key in `put` options — no in-memory Map, no memory leaks.
- The cleanup in `put:failed` is best-effort (`catch(() => {})`), so it does not mask the original error.

---

## checksum

Writes a SHA-256 sidecar file alongside each stored file and verifies integrity on every read. Detects silent data corruption (bit rot).

```typescript
import { checksum } from "@minimajs/disk/plugins";
```

```typescript
const disk = createDisk({ driver }, checksum());

await disk.put("data.json", content);
// Writes: "data.json" + "data.json.sha256"

const file = await disk.get("data.json");
await file.bytes(); // throws ChecksumMismatchError if corrupted
```

### Error handling

```typescript
import { ChecksumMismatchError } from "@minimajs/disk";

try {
  const file = await disk.get("data.json");
  await file.arrayBuffer();
} catch (err) {
  if (err instanceof ChecksumMismatchError) {
    console.error(`Corruption detected in ${err.path}`);
    console.error(`Expected: ${err.expected}`);
    console.error(`Actual:   ${err.actual}`);
  }
}
```

### Options

```typescript
interface ChecksumOptions {
  algorithm?: string; // default: "sha256" — any node:crypto hash algorithm
  extension?: string; // default: ".sha256" — sidecar file extension
}

const disk = createDisk({ driver }, checksum({ algorithm: "sha512", extension: ".sha512" }));
```

### Notes

- The sidecar file is written and read directly through the driver, bypassing hooks — it is invisible to other plugins.
- The sidecar is automatically deleted when the original file is deleted.
- Verification happens on stream read (lazy), not on `get()`.

---

## compression

Transparently compresses files on write and decompresses on read. Uses the Web API `CompressionStream` / `DecompressionStream` (Node 18+, Bun, modern browsers — no native dependencies).

```typescript
import { compression } from "@minimajs/disk/plugins";
```

```typescript
const disk = createDisk({ driver }, compression());

await disk.put("large.json", bigData); // stored compressed
const file = await disk.get("large.json"); // transparently decompressed
```

### Algorithms

```typescript
// gzip (default)
const disk = createDisk({ driver }, compression());
const disk = createDisk({ driver }, compression({ algorithm: "gzip" }));

// deflate
const disk = createDisk({ driver }, compression({ algorithm: "deflate" }));

// deflate-raw
const disk = createDisk({ driver }, compression({ algorithm: "deflate-raw" }));
```

### Driver metadata support

| `driver.capabilities.metadata` | Behavior                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `true`                         | Algorithm is stored per-file in metadata. Mixed compressed/uncompressed files are safe.                                               |
| `false` / unset                | Algorithm is NOT stored. Every file read through this disk is assumed to be compressed. Do not mix compressed and uncompressed files. |

```typescript
// S3 driver supports metadata — safe to mix
const disk = createDisk({ driver: createS3Driver({ … }) }, compression());

// Filesystem driver without metadata — all files must be compressed
const disk = createDisk({ driver: createFsDriver({ … }) }, compression());
```

### Notes

- Combine with `encryption` — compress first, then encrypt (compression before encryption is more effective).
- Does not affect `put(path, data)` calls where `data` is already compressed (you control the stream).

---

## encryption

Transparently encrypts files on write and decrypts on read using AES-256-GCM. All crypto parameters (salt, IV, auth tag) are embedded in the stream — no external metadata or sidecar files are needed.

```typescript
import { encryption } from "@minimajs/disk/plugins";
```

```typescript
const disk = createDisk({ driver }, encryption({ password: process.env.SECRET! }));

await disk.put("secret.txt", "sensitive data"); // stored encrypted
const file = await disk.get("secret.txt"); // automatically decrypted
const text = await file.text(); // "sensitive data"
```

### Options

```typescript
interface EncryptionOptions {
  password: string; // required — encryption/decryption key
  algorithm?: string; // default: "aes-256-gcm"
}
```

### Requirements

**Requires `driver.capabilities.metadata = true`.** The encryption flag is stored in file metadata so the decryption hook knows which files are encrypted. Drivers without metadata support cannot use this plugin — an error is thrown at startup.

```typescript
// S3 and Azure drivers support metadata ✅
const disk = createDisk({ driver: createS3Driver({ … }) }, encryption({ password: "…" }));

// Filesystem driver — metadata not supported ❌
// throws DiskConfigError at setup time
```

### Combining with compression

Always compress before encrypting — compression is more effective on plaintext:

```typescript
const disk = createDisk(
  { driver },
  compression(), // compress first
  encryption({ password: process.env.SECRET! }) // then encrypt
);
```

### Stream format

The encrypted stream is self-contained: `[MAGIC(4)] [salt(32)] [IV(16)] [ciphertext…] [GCM auth tag(16)]`. No external state is needed for decryption.

---

## uploadProgress

Tracks bytes written to the driver during an upload. Fires a callback for each chunk as it passes through.

```typescript
import { uploadProgress } from "@minimajs/disk/plugins";
```

```typescript
const disk = createDisk(
  { driver },
  uploadProgress(({ loaded, total, percentage }) => {
    if (percentage !== undefined) {
      console.log(`Upload: ${percentage.toFixed(1)}%`);
    } else {
      console.log(`Uploaded: ${loaded} bytes`);
    }
  })
);

await disk.put("video.mp4", stream, { size: file.size });
```

### Progress object

```typescript
interface UploadProgress {
  loaded: number; // bytes transferred so far
  total?: number; // total bytes (only available when size is passed in PutOptions)
  percentage?: number; // 0–100, only available when total is known
}
```

### Notes

- Pass `size` in `PutOptions` to get `total` and `percentage` in the callback.
- `uploadProgress` hooks into the `storing` event (just before data reaches the driver), so it reflects actual driver write throughput.
- For a single upload, create the disk (or use the plugin) per-request rather than globally if you need per-request callbacks.

---

## downloadProgress

Tracks bytes read from the driver during a download. Fires a callback for each chunk as it passes through.

```typescript
import { downloadProgress } from "@minimajs/disk/plugins";
```

```typescript
const disk = createDisk(
  { driver },
  downloadProgress(({ loaded, total, percentage }) => {
    if (percentage !== undefined) {
      console.log(`Download: ${percentage.toFixed(1)}%`);
    } else {
      console.log(`Downloaded: ${loaded} bytes`);
    }
  })
);

const file = await disk.get("video.mp4");
await file.arrayBuffer(); // progress fires as bytes are read
```

### Progress object

```typescript
interface DownloadProgress {
  loaded: number; // bytes read so far
  total?: number; // total bytes from file.size (available when driver returns size)
  percentage?: number; // 0–100, only available when total is known
}
```

### Difference from `uploadProgress`

|                | `uploadProgress`                     | `downloadProgress`                               |
| -------------- | ------------------------------------ | ------------------------------------------------ |
| Hook           | `storing`                            | `streaming`                                      |
| `total` source | `options.size` — caller must pass it | `file.size` — from driver metadata automatically |

### Notes

- `total` is populated automatically from `file.size` — no extra configuration needed.
- `downloadProgress` hooks into the `streaming` event (when the file stream is opened), so it fires on `file.arrayBuffer()`, `file.text()`, `file.bytes()`, or any stream read.
- For per-request callbacks, create the disk per-request rather than globally.

---

## Combining Plugins

Plugins compose cleanly — order matters for stream transforms (`storing`/`streaming` hooks run sequentially):

```typescript
// Full production setup: unique names + date folders + compress + encrypt + integrity
const disk = createDisk(
  { driver: createS3Driver({ bucket: "uploads", region: "us-east-1", credentials }) },
  storeAs("uuid"),
  partition({ by: "date" }),
  compression(),
  encryption({ password: process.env.ENCRYPTION_KEY! }),
  checksum()
);
```

```typescript
// Development: filesystem with atomic writes and integrity checks
const disk = createDisk({ driver: createFsDriver({ root: "./storage" }) }, atomicWrite(), checksum());
```

```typescript
// Upload handler with progress tracking
app.post("/upload", async (ctx) => {
  const file = ctx.get("file");

  const progressDisk = createDisk(
    { driver },
    storeAs("uuid-original"),
    uploadProgress(({ percentage }) => {
      console.log(`Upload: ${percentage?.toFixed(0)}%`);
    })
  );

  const uploaded = await progressDisk.put(file, { size: file.size });
  return ctx.json({ href: uploaded.href, name: uploaded.metadata.originalName });
});
```

```typescript
// Download handler with progress tracking
app.get("/download/:key", async (ctx) => {
  const progressDisk = createDisk(
    { driver },
    downloadProgress(({ loaded, total, percentage }) => {
      if (percentage !== undefined) console.log(`Download: ${percentage.toFixed(0)}%`);
    })
  );

  const file = await progressDisk.get(ctx.params.key);
  if (!file) return ctx.status(404);
  return new Response(file.stream(), { headers: { "Content-Type": file.type } });
});
```

## Writing Custom Plugins

A plugin is a function that receives a `Disk` instance and registers hooks:

```typescript
import type { DiskPlugin } from "@minimajs/disk";

function logger(prefix = "[disk]"): DiskPlugin {
  return (disk) => {
    disk.hook("stored", (file) => {
      console.log(`${prefix} stored: ${file.href} (${file.size} bytes)`);
    });
    disk.hook("deleted", (href) => {
      console.log(`${prefix} deleted: ${href}`);
    });
  };
}

const disk = createDisk({ driver }, logger("[uploads]"));
```

### Available hooks

| Hook            | When it fires                       | What you can return                    |
| --------------- | ----------------------------------- | -------------------------------------- |
| `put`           | Before a file is stored             | Modified `[path, data, options]` tuple |
| `storing`       | Just before data reaches the driver | Modified `ReadableStream`              |
| `stored`        | After a file is successfully stored | Modified `DiskFile`                    |
| `get`           | Before a file is retrieved          | Modified path string                   |
| `streaming`     | When the file stream is opened      | Modified `ReadableStream`              |
| `retrieved`     | After `get` returns a file          | Modified `DiskFile`                    |
| `delete`        | Before a file is deleted            | Modified `FileSource`                  |
| `deleted`       | After a file is deleted             | Modified href string                   |
| `copy`          | Before a copy operation             | Modified `[from, to]` tuple            |
| `copied`        | After a copy operation              | Modified `DiskFile`                    |
| `move`          | Before a move operation             | Modified `[from, to]` tuple            |
| `moved`         | After a move operation              | Modified `DiskFile`                    |
| `exists`        | Before an existence check           | Modified path string                   |
| `checked`       | After an existence check            | Modified boolean                       |
| `list`          | Before listing files                | Modified `[prefix, options]` tuple     |
| `url`           | After a URL is generated            | Modified URL string                    |
| `file`          | When a `DiskFile` is constructed    | Modified `DiskFile`                    |
| `put:failed`    | When `driver.put` throws            | Must re-throw (sync or async)          |
| `get:failed`    | When `driver.get` throws            | Must re-throw (sync or async)          |
| `delete:failed` | When `driver.delete` throws         | Must re-throw (sync or async)          |

## See Also

- [Main Documentation](./index.md)
- [Filesystem Driver](./filesystem.md)
- [AWS S3 Driver](./aws-s3.md)
- [Azure Blob Driver](./azure-blob.md)
