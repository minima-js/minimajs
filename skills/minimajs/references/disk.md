# @minimajs/disk — Storage Reference

Storage abstraction using web-native File APIs. Works with local filesystem, S3, Azure Blob, and any custom driver.

## Creating a Disk

```typescript
import { createDisk, createTempDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";
import { createS3Driver } from "@minimajs/aws-s3";
import { createAzureBlobDriver } from "@minimajs/azure-blob";

// Local filesystem
const disk = createDisk({ driver: createFsDriver({ root: "./uploads" }) });

// AWS S3
const disk = createDisk({
  driver: createS3Driver({ bucket: "my-bucket", region: "us-east-1" }),
});

// Azure Blob
const disk = createDisk({
  driver: createAzureBlobDriver({
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    container: "uploads",
  }),
});

// Default (uses CWD)
const disk = createDisk();

// Temp directory (files not auto-cleaned — delete when done)
const tmp = createTempDisk();

// In-memory (for tests)
import { createMemoryDriver } from "@minimajs/disk/adapters";
const disk = createDisk({ driver: createMemoryDriver() });
```

## DiskFile

`DiskFile` extends `File` (Web API). Returned by `disk.get()`, `disk.put()`, `disk.copy()`, `disk.move()`.

```typescript
const file = await disk.get("avatar.jpg");
file.name; // "avatar.jpg"
file.type; // "image/jpeg"
file.size; // bytes
file.href; // full URI: "file:///uploads/avatar.jpg" or "s3://bucket/avatar.jpg"
file.metadata; // Record<string, string> — driver-specific metadata (etag, etc.)
file.lastModified; // timestamp

// Standard File methods — stream lazily from storage
file.stream(); // ReadableStream
await file.text();
await file.bytes();
await file.arrayBuffer();
```

## Disk API

```typescript
// Write — DiskData = string | Buffer | ReadableStream | Blob | File | Uint8Array
await disk.put("images/avatar.jpg", fileOrData);
await disk.put(file); // uses File.name as key
await disk.put("path.txt", "hello world");

// Read — returns DiskFile (extends File) or null
const file = await disk.get("images/avatar.jpg");
if (file) {
  const text = await file.text();
  const buffer = await file.arrayBuffer();
  const stream = file.stream();
  const blob = await file.blob();
  console.log(file.href); // URL string
}

// Delete
await disk.delete("images/avatar.jpg");
await disk.delete(diskFile); // pass DiskFile directly

// Check existence
const exists = await disk.exists("images/avatar.jpg");

// Public URL
const url = disk.url("images/avatar.jpg");
const signedUrl = await disk.url("images/avatar.jpg", { signed: true, expiresIn: 3600 });

// Copy / Move
const copied = await disk.copy("src/file.jpg", "dst/file.jpg");
const moved = await disk.move("old/file.jpg", "new/file.jpg");

// List files
for await (const file of disk.list()) {
  /* all files */
}
for await (const file of disk.list("images/")) {
  /* files with prefix */
}
for await (const file of disk) {
  /* same as list() */
}

// Metadata
const meta = await disk.metadata("images/avatar.jpg");
// { size, lastModified, contentType, etag, ... } | null

// Watch (filesystem only)
const watcher = disk.watch("uploads/**/*.jpg", { persistent: false });
watcher.on("add", (path) => console.log("new file:", path));
```

## ProtoDisk — multi-provider routing

Route different path prefixes to different storage backends:

```typescript
import { createProtoDisk } from "@minimajs/disk";

const disk = createProtoDisk({
  protocols: {
    "file://":                   createFsDriver({ root: "./uploads" }),
    "s3://images/":              createS3Driver({ bucket: "images", region: "us-east-1" }),
    "https://cdn.example.com/":  createAzureBlobDriver({ ... }),
  },
  defaultProtocol: "file://",
});

// Route by protocol prefix
await disk.put("s3://images/avatar.jpg", imageBuffer);
await disk.get("file://tmp/report.pdf");
await disk.get("https://cdn.example.com/assets/logo.png");

// Cross-storage copy (automatically handles protocol differences)
await disk.copy("s3://images/file.jpg", "https://cdn.example.com/backup/file.jpg");

// Default protocol used when no prefix is specified
await disk.put("report.pdf", data);  // goes to file://
```

## Disk hooks

Intercept operations for logging, transformation, encryption, etc.:

```typescript
const unsubscribe = disk.hook("stored", (file) => {
  console.log("Stored:", file.href, file.size);
});

disk.hook("retrieved", (file) => {
  analytics.track("file.download", { path: file.href });
});

// Unsubscribe when done
unsubscribe();
```

### All hook signatures

Hooks can return a transformed value or void (pass-through). All are async-safe.

```typescript
// Write lifecycle
disk.hook("put", (path, data, options) => [newPath, newData, newOptions]); // transform before write
disk.hook("storing", (path, stream, options) => transformedStream); // transform stream before driver.put
disk.hook("stored", (file) => file); // after successful write
disk.hook("put:failed", (error, path, data, options) => {
  throw error;
}); // on driver.put error (must re-throw)

// Read lifecycle
disk.hook("get", (path) => transformedPath); // transform path before read
disk.hook("file", (file) => file); // when constructing DiskFile
disk.hook("streaming", (stream, file) => transformedStream); // transform read stream (e.g. decrypt)
disk.hook("retrieved", (file) => file); // after successful read
disk.hook("get:failed", (error, path) => {
  throw error;
}); // on driver.get error

// Delete lifecycle
disk.hook("delete", (source) => source);
disk.hook("deleted", (href) => href);
disk.hook("delete:failed", (error, href) => {
  throw error;
});

// Other
disk.hook("exists", (path) => path);
disk.hook("checked", (path, exists) => exists);
disk.hook("url", (path, url, options) => url);
disk.hook("copy", (from, to) => [from, to]);
disk.hook("copied", (from, to, file) => file);
disk.hook("move", (from, to) => [from, to]);
disk.hook("moved", (from, to, file) => file);
disk.hook("list", (prefix, options) => [prefix, options]);
```

## Disk plugins (advanced)

```typescript
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";
// Plugin imports depend on @minimajs/disk version

const disk = createDisk(
  { driver: createFsDriver({ root: "./secure" }) }
  // compression(),
  // atomicWrite(),
  // encrypt({ password: process.env.DISK_SECRET }),
);
```

## Common patterns

### File upload → S3

```typescript
import { raw } from "@minimajs/multipart";
import { helpers } from "@minimajs/multipart";
import { createDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";

const disk = createDisk({ driver: createS3Driver({ bucket: "uploads", region: "us-east-1" }) });

export const routes: Routes = {
  "POST /upload": async () => {
    for await (const [, rawFile] of raw.files()) {
      const key = `uploads/${helpers.randomName(rawFile.filename)}`;
      await disk.put(key, rawFile.stream);
      return { url: disk.url(key) };
    }
  },
};
```

### Serve a file from disk

```typescript
export const routes: Routes = {
  "GET /files/:path": async () => {
    const path = params.get("path");
    const file = await disk.get(path);
    if (!file) abort.notFound();
    return new Response(file.stream(), {
      headers: { "content-type": file.type, "content-length": String(file.size) },
    });
  },
};
```
