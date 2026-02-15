# Disk Storage

Universal file storage abstraction for Node.js and Bun. Write once, store anywhere - filesystem, S3, Azure Blob, or any cloud provider.

## Features

- 🌐 **Universal API** - Same interface for all storage providers
- 📦 **Multiple Drivers** - Filesystem, S3, Azure, Memory, and more
- 🔀 **Protocol Routing** - Route to different drivers based on URL prefixes
- 🚀 **Streaming** - Efficient stream-based operations
- 🔒 **Type Safe** - Full TypeScript support
- 🧪 **Testing** - Memory driver for fast unit tests
- ⚡ **Performance** - Optimized with lazy loading and caching

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
import { createDisk, createFsDriver } from "@minimajs/disk";

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
file.href; // Storage identifier (e.g., "s3://bucket/document.pdf")
file.name; // Filename (e.g., "document.pdf")
file.size; // File size in bytes
file.type; // MIME type (e.g., "application/pdf")
file.lastModified; // Date object
file.metadata; // Custom metadata

// Read file content
const buffer = await file.arrayBuffer();
const text = await file.text();
const bytes = await file.bytes();
const stream = file.stream(); // ReadableStream

// Stream can be called multiple times
// First call uses cached stream, subsequent calls re-fetch
const stream1 = file.stream(); // Uses cached stream
const stream2 = file.stream(); // Re-fetches from storage
```

### Storage Identifiers (href)

Each file has an `href` that uniquely identifies it within the storage system:

- **Filesystem**: `file:///var/uploads/avatar.jpg`
- **S3**: `s3://bucket/path/to/file.jpg`
- **Azure**: `https://account.blob.core.windows.net/container/file.jpg`
- **Memory**: `/path/to/file.jpg`

Use `href` for cross-storage operations:

```typescript
// Copy between different storage systems
await disk.copy(file.href, "backups/file.jpg");
```

## API Reference

### Disk Operations

#### `put(path, data, options?)`

Store a file.

```typescript
const file = await disk.put("uploads/photo.jpg", imageData, {
  type: "image/jpeg",
  metadata: { userId: "123", album: "vacation" },
});
```

**Parameters:**

- `path: string` - File path
- `data: Blob | File | string | ArrayBuffer | ReadableStream` - File content
- `options?: PutOptions` - Optional settings
  - `type?: string` - MIME type
  - `metadata?: Record<string, string>` - Custom metadata
  - `lastModified?: Date` - Last modified date

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

#### `delete(path)`

Delete a file.

```typescript
await disk.delete("uploads/photo.jpg");
```

**Parameters:**

- `path: string` - File path

**Returns:** `Promise<void>`

#### `url(path, options?)`

Get public URL for a file.

```typescript
const url = await disk.url("uploads/photo.jpg", {
  expiresIn: 3600, // 1 hour (for signed URLs)
});
```

**Parameters:**

- `path: string` - File path
- `options?: UrlOptions` - URL generation options
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

- `from: string | DiskFile` - Source file path or DiskFile instance
- `to: string` - Destination path

**Returns:** `Promise<DiskFile>`

#### `move(from, to)`

Move/rename a file.

```typescript
await disk.move("uploads/photo.jpg", "archive/photo.jpg");
```

**Parameters:**

- `from: string | DiskFile` - Source file path or DiskFile instance
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
- `options?: ListOptions` - Listing options
  - `limit?: number` - Maximum number of files to return

**Returns:** `AsyncIterable<DiskFile>`

#### `getMetadata(path)`

Get file metadata without downloading content.

```typescript
const metadata = await disk.getMetadata("uploads/photo.jpg");
if (metadata) {
  console.log(metadata.size, metadata.type, metadata.lastModified);
}
```

**Parameters:**

- `path: string` - File path

**Returns:** `Promise<FileMetadata | null>`

## Drivers

### Available Drivers

- **[Filesystem](./filesystem.md)** - Local file storage
- **[AWS S3](./aws-s3.md)** - Amazon S3 storage
- **[Azure Blob](./azure-blob.md)** - Microsoft Azure Blob Storage
- **[Memory](./memory.md)** - In-memory storage (testing)
- **[Protocol Disk](./protocol-disk.md)** - Multi-driver routing

### Creating Custom Drivers

Implement the `DiskDriver` interface:

```typescript
import type { DiskDriver, FileMetadata, PutOptions } from "@minimajs/disk";

class CustomDriver implements DiskDriver {
  async put(href: string, stream: ReadableStream, options?: PutOptions): Promise<FileMetadata> {
    // Store the file and return metadata
  }

  async get(href: string): Promise<[ReadableStream, FileMetadata] | null> {
    // Return stream and metadata, or null if not found
  }

  async delete(href: string): Promise<void> {
    // Delete the file
  }

  async exists(href: string): Promise<boolean> {
    // Check if file exists
  }

  async copy(from: string, to: string): Promise<void> {
    // Copy file (can use get + put if native copy not available)
  }

  async move(from: string, to: string): Promise<void> {
    // Move file (can use copy + delete if native move not available)
  }

  async *list(prefix?: string, options?: ListOptions): AsyncIterable<FileMetadata> {
    // Yield file metadata for all matching files
  }

  async getMetadata(href: string): Promise<FileMetadata | null> {
    // Return metadata without fetching content
  }

  async url(href: string, options?: UrlOptions): Promise<string> {
    // Generate public URL
  }
}
```

## Error Handling

The disk package provides typed errors for better error handling:

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
- `DiskFileExistsError` - File already exists
- `DiskCopyError` - Copy operation failed
- `DiskMoveError` - Move operation failed
- `DiskDeleteError` - Delete operation failed
- `DiskUrlError` - URL generation failed
- `DiskMetadataError` - Metadata retrieval failed
- `DiskConfigError` - Invalid configuration

## Examples

See the [Examples](./examples.md) page for comprehensive examples covering:

- Basic file operations
- Stream processing
- Multi-part uploads
- Image processing
- PDF generation
- Cross-storage synchronization
- Testing strategies

## Next Steps

- [Filesystem Driver](./filesystem.md)
- [AWS S3 Driver](./aws-s3.md)
- [Protocol Disk](./protocol-disk.md)
- [Memory Driver](./memory.md)
- [Examples](./examples.md)
