# @minimajs/disk

Universal disk storage abstraction with support for multiple storage backends.

## Features

- ✅ **Unified API** - Same interface for all storage backends
- ✅ **Type-Safe** - Full TypeScript support with strict types
- ✅ **Streaming** - Efficient handling of large files
- ✅ **Protocol Routing** - Route by URL prefix (s3://, file://, etc.)
- ✅ **Web Standards** - Works with File, Blob, and ReadableStream
- ✅ **Error Handling** - Typed error classes for better error management
- ✅ **Metadata** - Attach custom metadata to files

## Installation

```bash
npm install @minimajs/disk
```

## Quick Start

### Filesystem Storage

```typescript
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters/fs";

const disk = createDisk({
  driver: createFsDriver({ root: "./storage" }),
});

// Store file
await disk.put("documents/readme.txt", "Hello, World!");

// Retrieve file
const file = await disk.get("documents/readme.txt");
const text = await file.text();
```

### Memory Storage (for testing)

```typescript
import { createDisk } from "@minimajs/disk";
import { createMemoryDriver } from "@minimajs/disk/adapters/memory";

const disk = createDisk({
  driver: createMemoryDriver(),
});

await disk.put("test.txt", "Test content");
const file = await disk.get("test.txt");
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

await disk.put("uploads/avatar.jpg", imageBuffer);
```

## API

### Storage Operations

- `put(path, data, options?)` - Store a file
- `get(path)` - Retrieve a file
- `exists(path)` - Check if file exists
- `delete(path)` - Delete a file
- `copy(from, to, options?)` - Copy a file
- `move(from, to, options?)` - Move a file
- `list(prefix?, options?)` - List files
- `url(path, options?)` - Get public URL

### File Operations

The `DiskFile` extends the Web `File` API:

```typescript
const file = await disk.get("document.pdf");

// Web File API
file.name; // File name
file.size; // File size in bytes
file.type; // MIME type
file.lastModified; // Last modified timestamp

// Read operations
await file.text(); // Read as text
await file.arrayBuffer(); // Read as ArrayBuffer
file.stream(); // Get ReadableStream

// Disk-specific
file.href; // Full storage path (e.g., s3://bucket/path)
file.metadata; // Custom metadata
```

## Available Drivers

| Driver     | Package            | Use Case    |
| ---------- | ------------------ | ----------- |
| Filesystem | `@minimajs/disk`   | Development |
| Memory     | `@minimajs/disk`   | Testing     |
| AWS S3     | `@minimajs/aws-s3` | Production  |

## Documentation

For comprehensive documentation, examples, and advanced usage, visit:

- [Complete Documentation](../../docs/packages/disk/)

## License

MIT
