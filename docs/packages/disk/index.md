# Disk Storage

Universal file storage abstraction for Node.js and Bun. Write once, store anywhere — filesystem, S3, Azure Blob, or any cloud provider.

> **Standalone package** — `@minimajs/disk` has no dependency on the rest of the minimajs framework. Use it in any Node.js or Bun project, with Express, Fastify, Hono, or no HTTP framework at all.

## Features

- 🌐 **Universal API** - Same interface for all storage providers
- 📦 **Multiple Drivers** - Filesystem, S3, Azure, Memory, and more
- 🔀 **Protocol Routing** - Route to different drivers based on URL prefixes
- 🚀 **Streaming** - Efficient stream-based operations
- 🔒 **Type Safe** - Full TypeScript support
- 🧩 **Plugins** - `storeAs`, `partition`, `atomicWrite`, `checksum`, `compression`, `encryption` and more
- 🌍 **Web Standards** - Works with `File`, `Blob`, and `ReadableStream` natively
- 📎 **File Integrity** - `put(file)` preserves the original filename by default
- 🧪 **Testing** - Memory driver for fast unit tests

## Installation

```bash
npm install @minimajs/disk
# or
bun add @minimajs/disk
```

For cloud providers:

```bash
npm install @minimajs/aws-s3
npm install @minimajs/azure-blob
```

## Quick Start

### Filesystem Storage

```typescript
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";

const disk = createDisk({
  driver: createFsDriver({
    root: "/var/uploads",
    publicUrl: "https://cdn.example.com",
  }),
});

// Store a file
const file = await disk.put("avatar.jpg", imageData);
console.log(file.href); // file:///var/uploads/avatar.jpg

// Retrieve a file
const retrieved = await disk.get("avatar.jpg");
if (retrieved) {
  const buffer = await retrieved.arrayBuffer();
  const text = await retrieved.text();
  const stream = retrieved.stream();
}

// Check existence
const exists = await disk.exists("avatar.jpg");

// Get public URL
const url = await disk.url("avatar.jpg");
console.log(url); // https://cdn.example.com/avatar.jpg

// Delete
await disk.delete("avatar.jpg");
```

### AWS S3 Storage

```typescript
import { createDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";

const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

// Same API as filesystem!
await disk.put("avatar.jpg", imageData);
const file = await disk.get("avatar.jpg");
```

### Memory Storage (Testing)

```typescript
import { createDisk, createMemoryDriver } from "@minimajs/disk";

const driver = createMemoryDriver();
const disk = createDisk({ driver });

// Perfect for tests
await disk.put("test.txt", "Hello World");

// Clear after tests
driver.clear();
```

## Core Concepts

### DiskFile

All `get()`, `put()`, `copy()`, and `move()` operations return a `DiskFile` instance:

```typescript
const file = await disk.put("document.pdf", pdfData);

// File properties
file.href;         // Storage identifier (e.g., "s3://bucket/document.pdf")
file.name;         // Filename (e.g., "document.pdf")
file.size;         // File size in bytes
file.type;         // MIME type (e.g., "application/pdf")
file.lastModified; // Timestamp
file.metadata;     // Custom metadata

// Read file content
const buffer = await file.arrayBuffer();
const text = await file.text();
const bytes = await file.bytes();
const stream = file.stream(); // ReadableStream
```

### Storage Identifiers (href)

Each file has an `href` that uniquely identifies it within the storage system:

- **Filesystem**: `file:///var/uploads/avatar.jpg`
- **S3**: `s3://bucket/path/to/file.jpg`
- **Azure**: `https://account.blob.core.windows.net/container/file.jpg`
- **Memory**: `/path/to/file.jpg`

## API Reference

### Disk Operations

#### `put(path, data, options?)`

Store a file by path.

```typescript
const file = await disk.put("uploads/photo.jpg", imageData, {
  type: "image/jpeg",
  metadata: { userId: "123", album: "vacation" },
});
```

**Parameters:**

- `path: string` - File path
- `data: Blob | File | string | ArrayBuffer | ReadableStream` - File content
- `options?: PutOptions`
  - `type?: string` - MIME type
  - `metadata?: Record<string, string>` - Custom metadata
  - `lastModified?: Date` - Last modified date

**Returns:** `Promise<DiskFile>`

#### `put(file, options?)`

Store a `File` object directly. The file is stored under **its original name** (`file.name`) — the filename is preserved as-is (file integrity).

```typescript
// Stored under the file's original name
const uploaded = await disk.put(uploadedFile);
console.log(uploaded.name); // same as uploadedFile.name

// With additional options
const uploaded = await disk.put(uploadedFile, {
  metadata: { userId: "123" },
});
```

To generate unique or structured names automatically, use the [`storeAs`](./plugins.md#storeas) plugin.

**Parameters:**

- `file: File` - A Web API `File` object (e.g., from a multipart upload)
- `options?: PutOptions` - MIME type is inferred from `file.type` if not set

**Returns:** `Promise<DiskFile>`

#### `get(path)`

Retrieve a file.

```typescript
const file = await disk.get("uploads/photo.jpg");
if (file) {
  const data = await file.arrayBuffer();
}
```

**Parameters:**

- `path: string` - File path

**Returns:** `Promise<DiskFile | null>`

#### `exists(path)`

Check if a file exists.

```typescript
const exists = await disk.exists("uploads/photo.jpg");
```

**Parameters:**

- `path: string` - File path

**Returns:** `Promise<boolean>`

#### `delete(source)`

Delete a file by path, `File`, or `DiskFile`.

```typescript
// By path
await disk.delete("uploads/photo.jpg");

// By DiskFile — uses file.href (storage identifier)
const file = await disk.get("uploads/photo.jpg");
await disk.delete(file);

// By plain File — uses file.name as the path
await disk.delete(uploadedFile);
```

**Parameters:**

- `source: string | File` - File path, `File`, or `DiskFile`

**Returns:** `Promise<string>` — the resolved href of the deleted file

#### `url(path, options?)`

Get public URL for a file.

```typescript
const url = await disk.url("uploads/photo.jpg", {
  expiresIn: 3600, // 1 hour (for signed URLs)
});
```

**Parameters:**

- `path: string` - File path
- `options?: UrlOptions`
  - `expiresIn?: number` - Expiration time in seconds (for signed URLs)

**Returns:** `Promise<string>`

#### `copy(from, to)`

Copy a file.

```typescript
// From path
await disk.copy("uploads/photo.jpg", "backups/photo.jpg");

// From DiskFile
const file = await disk.get("uploads/photo.jpg");
await disk.copy(file, "backups/photo.jpg");
```

**Parameters:**

- `from: string | File` - Source file path, `File`, or `DiskFile`
- `to: string` - Destination path

**Returns:** `Promise<DiskFile>`

#### `move(from, to)`

Move/rename a file.

```typescript
await disk.move("uploads/photo.jpg", "archive/photo.jpg");
```

**Parameters:**

- `from: string | File` - Source file path, `File`, or `DiskFile`
- `to: string` - Destination path

**Returns:** `Promise<DiskFile>`

#### `list(prefix?, options?)`

List files with optional prefix filtering.

```typescript
for await (const file of disk.list("uploads/")) {
  console.log(file.href, file.size);
}

// With limit
for await (const file of disk.list("uploads/", { limit: 10 })) {
  console.log(file.name);
}
```

**Parameters:**

- `prefix?: string` - Filter by prefix (optional)
- `options?: ListOptions`
  - `limit?: number` - Maximum number of files to return

**Returns:** `AsyncIterable<DiskFile>`

#### `metadata(path)`

Get file metadata without downloading content.

```typescript
const metadata = await disk.metadata("uploads/photo.jpg");
if (metadata) {
  console.log(metadata.size, metadata.type, metadata.lastModified);
}
```

**Parameters:**

- `path: string` - File path

**Returns:** `Promise<FileMetadata | null>`

## Plugins

Plugins extend disk behavior by hooking into file operations. Pass them as rest arguments to `createDisk`:

```typescript
import { createDisk, storeAs, partition, atomicWrite, checksum } from "@minimajs/disk";

const disk = createDisk(
  { driver: createFsDriver({ root: "./uploads" }) },
  storeAs("uuid"),
  partition({ by: "date" }),
  atomicWrite(),
  checksum()
);
```

### `storeAs(nameStrategy | nameGenerator)`

Automatically rename files when a `File` object is passed to `put`. By default, `put(file)` preserves the original filename — use `storeAs` to opt into UUID-based or custom naming.

```typescript
import { storeAs } from "@minimajs/disk";

// UUID filename — "550e8400-….jpg"
const disk = createDisk({ driver }, storeAs("uuid"));

// UUID prefix + original name — "550e8400-…-photo.jpg"
const disk = createDisk({ driver }, storeAs("uuid-original"));

// Custom generator — full control (sync or async)
const disk = createDisk({ driver }, storeAs(file =>
  `${new Date().getFullYear()}/${randomUUID()}${extname(file.name)}`
));
```

When the name is changed, the original filename is saved in `file.metadata.originalName`.

| Strategy | Example output |
|---|---|
| `"uuid"` (default) | `550e8400-….jpg` |
| `"uuid-original"` | `550e8400-…-photo.jpg` |
| `(file) => string` | whatever you return |

**Only applies when `data instanceof File`.** Calls with a plain path are unaffected.

→ **[View all plugins](./plugins.md)**

## Drivers

| Driver | Package | Use Case |
|---|---|---|
| Filesystem | `@minimajs/disk` | Local / development |
| Memory | `@minimajs/disk` | Testing |
| AWS S3 | `@minimajs/aws-s3` | Production |
| Azure Blob | `@minimajs/azure-blob` | Production |

- **[Filesystem Driver](./filesystem.md)** - Local file storage
- **[AWS S3 Driver](./aws-s3.md)** - Amazon S3 storage
- **[Azure Blob Driver](./azure-blob.md)** - Microsoft Azure Blob Storage
- **[Memory Driver](./memory.md)** - In-memory storage for testing
- **[Protocol Disk](./protocol-disk.md)** - Multi-driver routing by URL prefix

### Creating Custom Drivers

Implement the `DiskDriver` interface:

```typescript
import type { DiskDriver, FileMetadata, PutOptions, ListOptions, UrlOptions } from "@minimajs/disk";

class CustomDriver implements DiskDriver {
  async put(href: string, stream: ReadableStream, options?: PutOptions): Promise<FileMetadata> { … }
  async get(href: string): Promise<[ReadableStream, FileMetadata] | null> { … }
  async delete(href: string): Promise<void> { … }
  async exists(href: string): Promise<boolean> { … }
  async copy(from: string, to: string): Promise<void> { … }
  async move(from: string, to: string): Promise<void> { … }
  async *list(prefix?: string, options?: ListOptions): AsyncIterable<FileMetadata> { … }
  async metadata(href: string): Promise<FileMetadata | null> { … }
  async url(href: string, options?: UrlOptions): Promise<string> { … }
}
```

## Error Handling

```typescript
import { DiskReadError, DiskWriteError, DiskFileNotFoundError, DiskMetadataError } from "@minimajs/disk";

try {
  await disk.get("missing.txt");
} catch (error) {
  if (error instanceof DiskFileNotFoundError) {
    console.log("File not found:", error.href);
  } else if (error instanceof DiskReadError) {
    console.log("Failed to read:", error.href);
  }
}
```

### Error Types

- `DiskError` - Base error class
- `DiskReadError` - Failed to read file
- `DiskWriteError` - Failed to write file
- `DiskFileNotFoundError` - File not found
- `DiskCopyError` - Copy operation failed
- `DiskMoveError` - Move operation failed
- `DiskDeleteError` - Delete operation failed
- `DiskUrlError` - URL generation failed
- `DiskMetadataError` - Metadata retrieval failed
- `DiskConfigError` - Invalid configuration

## See Also

- [Plugins](./plugins.md)
- [Protocol Disk](./protocol-disk.md)
- [Examples](./examples.md)
