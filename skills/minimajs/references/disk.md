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

// Temp directory (auto-cleaned)
const tmp = createTempDisk();
```

## Disk API

```typescript
// Write — DiskData = string | Buffer | ReadableStream | Blob | File | Uint8Array
await disk.put("images/avatar.jpg", fileOrData);
await disk.put(file);                            // uses File.name as key
await disk.put("path.txt", "hello world");

// Read — returns DiskFile (extends File) or null
const file = await disk.get("images/avatar.jpg");
if (file) {
  const text = await file.text();
  const buffer = await file.arrayBuffer();
  const stream = file.stream();
  const blob = await file.blob();
  console.log(file.href);  // URL string
}

// Delete
await disk.delete("images/avatar.jpg");
await disk.delete(diskFile);                     // pass DiskFile directly

// Check existence
const exists = await disk.exists("images/avatar.jpg");

// Public URL
const url = disk.url("images/avatar.jpg");
const signedUrl = await disk.url("images/avatar.jpg", { signed: true, expiresIn: 3600 });

// Copy / Move
const copied = await disk.copy("src/file.jpg", "dst/file.jpg");
const moved = await disk.move("old/file.jpg", "new/file.jpg");

// List files
for await (const file of disk.list()) { /* all files */ }
for await (const file of disk.list("images/")) { /* files with prefix */ }
for await (const file of disk) { /* same as list() */ }

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

Intercept operations for logging, transformation, etc.:

```typescript
const unsubscribe = disk.hook("stored", (file) => {
  console.log("Stored:", file.href, file.size);
});

disk.hook("retrieved", (file) => {
  analytics.track("file.download", { path: file.href });
});

// All hook events:
// put, storing, stored, putFailed
// get, file, streaming, retrieved, getFailed
// delete, deleted, deleteFailed
// exists, checked
// url, copy, copied, move, moved, list

// Unsubscribe when done
unsubscribe();
```

## Disk plugins (advanced)

```typescript
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";
// Plugin imports depend on @minimajs/disk version

const disk = createDisk(
  { driver: createFsDriver({ root: "./secure" }) },
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
