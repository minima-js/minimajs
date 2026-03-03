# Filesystem Driver

Local filesystem storage driver for Node.js. Store files on disk with optional public URL generation.

## Best Fit

Use the filesystem driver when:

- you need low-latency local storage in development
- you run a single-node or shared-volume deployment
- you want simple operational setup with direct file access
- you are iterating before moving to cloud object storage

## Features

- 💾 **Local Storage** - Store files on local or network filesystem
- 🔒 **Directory Traversal Protection** - Paths validated against root, throws `DiskAccessError` on violation
- 🌐 **Public URLs** - Generate public URLs for CDN/web server access
- 📁 **Automatic Directory Creation** - Creates subdirectories as needed
- 📎 **Sidecar Metadata** - Optional per-file metadata stored in companion files
- 🚀 **Fast** - Direct filesystem I/O with streaming

## Installation

```bash
npm install @minimajs/disk
# or
bun add @minimajs/disk
```

## Usage

### Basic Usage

```typescript
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";

const disk = createDisk({
  driver: createFsDriver({
    root: "file:///var/uploads/",
  }),
});

// Store a file
await disk.put("images/avatar.jpg", imageData);

// Retrieve a file
const file = await disk.get("images/avatar.jpg");
if (file) {
  const buffer = await file.arrayBuffer();
}

// Check existence
const exists = await disk.exists("images/avatar.jpg");

// Delete
await disk.delete("images/avatar.jpg");
```

### With Public URLs

```typescript
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";

const disk = createDisk({
  driver: createFsDriver({
    root: "file:///var/www/uploads/",
    publicUrl: "https://cdn.example.com/uploads",
  }),
});

await disk.put("avatar.jpg", imageData);

// Generate public URL
const url = await disk.url("avatar.jpg");
console.log(url); // https://cdn.example.com/uploads/avatar.jpg
```

### Express.js Integration

```typescript
import express from "express";
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";

const disk = createDisk({
  driver: createFsDriver({
    root: "file:///var/uploads/",
    publicUrl: "http://localhost:3000/files",
  }),
});

const app = express();

app.post("/upload", async (req, res) => {
  const file = await disk.put(`uploads/${req.file.name}`, req.file.data);
  res.json({
    url: await disk.url(file.href),
    size: file.size,
  });
});

app.use("/files", express.static("/var/uploads"));

app.listen(3000);
```

## Configuration

```typescript
interface FsDriverOptions {
  /**
   * Root directory as a `file://` URL — must end with a trailing slash.
   * @example "file:///var/storage/"
   */
  root: string;

  /**
   * Base URL for generating public URLs.
   * Required if calling disk.url()
   */
  publicUrl?: string;

  /** File permission mode (default: 0o644) */
  fileMode?: number;

  /** Directory permission mode (default: 0o755) */
  dirMode?: number;

  /** Follow symbolic links (default: false) */
  followSymlinks?: boolean;

  /**
   * Store custom metadata in sidecar files.
   * Pass `true` to enable with defaults, or an options object to customize
   * the file extension and serialization format.
   * @default false
   */
  sidecarMetadata?: boolean | SidecarMetadataOptions;
}
```

### The `root` URL

The `root` option must be a `file://` URL **with a trailing slash**. This is intentionally strict:

- The trailing slash tells the driver that `root` is a directory base, not a file prefix.
- Without it, URL resolution becomes ambiguous. For example, two drivers with roots
  `file:///business-a/` and `file:///business-b/` share no overlap — but `file:///business`
  (no slash) would incorrectly treat both as within itself.

```typescript
// ✅ Correct
createFsDriver({ root: "file:///var/storage/" });

// ❌ Throws DiskConfigError — missing trailing slash
createFsDriver({ root: "file:///var/storage" });

// ❌ Throws DiskConfigError — not a file:// URL
createFsDriver({ root: "/var/storage/" });
```

To convert a plain path to a `file://` URL:

```typescript
import { pathToFileURL } from "node:url";

const root = pathToFileURL("/var/storage").href + "/";
// → "file:///var/storage/"
```

### Sidecar Metadata

Enable per-file metadata stored in companion sidecar files:

```typescript
// Enable with defaults (.metadata.json extension, JSON serialization)
createFsDriver({
  root: "file:///var/storage/",
  sidecarMetadata: true,
});

// Customize extension and serialization
createFsDriver({
  root: "file:///var/storage/",
  sidecarMetadata: {
    extension: ".meta",
    serializer: {
      serialize: (data) => JSON.stringify(data),
      deserialize: (raw) => JSON.parse(raw),
    },
  },
});
```

With sidecar metadata enabled, putting a file with metadata:

```typescript
await disk.put("report.pdf", pdfData, {
  metadata: { userId: "123", department: "sales" },
});
// Creates: report.pdf + report.pdf.metadata.json
```

### Example Configurations

```typescript
// Development
createFsDriver({
  root: "file:///tmp/uploads/",
  publicUrl: "http://localhost:3000/uploads",
});

// Production with CDN
createFsDriver({
  root: "file:///var/www/storage/",
  publicUrl: "https://cdn.example.com",
});

// Network share
createFsDriver({
  root: "file:///mnt/nfs/shared/",
  publicUrl: "https://files.example.com",
});
```

## Security

### Directory Traversal Protection

All hrefs are resolved in URL space against the root and validated for containment.
Any path that resolves outside the root throws a `DiskAccessError`:

```typescript
import { DiskAccessError } from "@minimajs/disk";

try {
  await disk.put("../../../etc/passwd", "malicious");
} catch (error) {
  if (error instanceof DiskAccessError) {
    console.log(error.message);
    // Access denied: "../../../etc/passwd" resolves outside the root directory
  }
}
```

### Permissions

Ensure the Node.js process has appropriate permissions:

```bash
sudo chown -R nodejs:nodejs /var/uploads
sudo chmod -R 750 /var/uploads
```

## File Storage

Files are stored with their original structure:

```
/var/uploads/
├── images/
│   ├── avatar.jpg
│   └── banner.png
├── documents/
│   └── report.pdf
└── videos/
    └── intro.mp4
```

Each file's `href` uses the `file://` protocol:

```typescript
const file = await disk.put("images/avatar.jpg", data);
console.log(file.href); // file:///var/uploads/images/avatar.jpg
```

## API

All standard [Disk operations](./index.md#api-reference) are supported:

- `put(path, data, options?)` - Store files
- `get(path)` - Retrieve files
- `delete(path)` - Delete files
- `exists(path)` - Check existence
- `copy(from, to)` - Copy files
- `move(from, to)` - Move/rename files
- `list(prefix?, options?)` - List files
- `url(path, options?)` - Generate public URLs
- `metadata(path)` - Get file metadata

## Examples

### Upload with Metadata

```typescript
await disk.put("documents/report.pdf", pdfData, {
  type: "application/pdf",
  metadata: {
    userId: "123",
    department: "sales",
    uploadedAt: new Date().toISOString(),
  },
});
```

### List Files

```typescript
// List all images
for await (const file of disk.list("images/")) {
  console.log(file.href, file.size);
}

// List with limit
for await (const file of disk.list("images/", { limit: 10 })) {
  console.log(file.href);
}
```

### Copy and Move

```typescript
await disk.copy("images/avatar.jpg", "backups/avatar.jpg");
await disk.move("temp/upload.jpg", "images/avatar.jpg");
```

### Stream Processing

```typescript
const file = await disk.get("video.mp4");
if (file) {
  const reader = file.stream().getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
}
```

## Error Handling

```typescript
import { DiskFileNotFoundError, DiskWriteError, DiskAccessError, DiskConfigError } from "@minimajs/disk";

// Path traversal attempt
try {
  await disk.get("../../etc/passwd");
} catch (error) {
  if (error instanceof DiskAccessError) {
    console.log(error.href); // "../../etc/passwd"
  }
}

// File not found
const file = await disk.get("missing.txt");
if (!file) {
  console.log("File does not exist");
}
```

## Performance Considerations

### Large Files

The driver streams files directly — no buffering in memory:

```typescript
// Stream the file (memory-efficient)
const file = await disk.get("large-video.mp4");
if (file) {
  // Pipe stream directly to HTTP response, another writer, etc.
  await file.stream().pipeTo(writableStream);
}
```

### Concurrent Operations

```typescript
// Safe — concurrent writes to different files
await Promise.all([disk.put("file1.txt", data1), disk.put("file2.txt", data2), disk.put("file3.txt", data3)]);
```

## Comparison

| Feature     | Filesystem      | S3               | Memory      |
| ----------- | --------------- | ---------------- | ----------- |
| Speed       | 🚀 Fast         | 🌐 Network       | ⚡ Fastest  |
| Persistence | ✅ Persistent   | ✅ Persistent    | ❌ Volatile |
| Setup       | ✅ Simple       | 🔧 AWS config    | ✅ None     |
| Cost        | 💰 Storage only | 💰💰 Per request | Free        |
| Scalability | 📦 Limited      | ♾️ Unlimited     | 🔒 RAM      |
| Redundancy  | ❌ Single point | ✅ Multi-region  | ❌ None     |
| Use Case    | Local files     | Production       | Testing     |

## When to Use

### ✅ Good For:

- Development and testing
- Small to medium applications
- Local file processing
- Network-attached storage (NAS)
- Fast access requirements
- Cost-sensitive projects

### ❌ Consider Alternatives For:

- High-traffic production apps (use S3)
- Multi-server deployments (use cloud storage)
- Automatic backups/redundancy (use S3)
- Global CDN distribution (use S3 + CloudFront)

## See Also

- [Main Documentation](./index.md)
- [AWS S3 Driver](./aws-s3.md)
- [Protocol Disk](./protocol-disk.md)
- [Plugins](./plugins.md)
