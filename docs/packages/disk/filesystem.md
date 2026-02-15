# Filesystem Driver

Local filesystem storage driver for Node.js. Store files on disk with optional public URL generation.

## Features

- 💾 **Local Storage** - Store files on local or network filesystem
- 🔒 **Directory Traversal Protection** - Automatic path sanitization
- 🌐 **Public URLs** - Generate public URLs for CDN/web server access
- 📁 **Automatic Directory Creation** - Creates subdirectories as needed
- 🚀 **Fast** - Direct filesystem I/O

## Installation

```bash
npm install @minimajs/disk
# or
bun add @minimajs/disk
```

## Usage

### Basic Usage

```typescript
import { createDisk, createFsDriver } from "@minimajs/disk";

const disk = createDisk({
  driver: createFsDriver({
    root: "/var/uploads",
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
import { createDisk, createFsDriver } from "@minimajs/disk";

const disk = createDisk({
  driver: createFsDriver({
    root: "/var/www/uploads",
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
import { createDisk, createFsDriver } from "@minimajs/disk";

const disk = createDisk({
  driver: createFsDriver({
    root: "/var/uploads",
    publicUrl: "http://localhost:3000/files",
  }),
});

const app = express();

// File upload endpoint
app.post("/upload", async (req, res) => {
  const file = await disk.put(`uploads/${req.file.name}`, req.file.data);
  res.json({
    url: await disk.url(file.href),
    size: file.size,
  });
});

// Serve files
app.use("/files", express.static("/var/uploads"));

app.listen(3000);
```

## Configuration

```typescript
interface FsDriverOptions {
  /**
   * Root directory for file storage
   * All file paths are relative to this directory
   */
  root: string;

  /**
   * Base URL for generating public URLs
   * Optional - required if calling disk.url()
   */
  publicUrl?: string;
}
```

### Example Configurations

```typescript
// Development
createFsDriver({
  root: "/tmp/uploads",
  publicUrl: "http://localhost:3000/uploads",
});

// Production with CDN
createFsDriver({
  root: "/var/www/storage",
  publicUrl: "https://cdn.example.com",
});

// Network share
createFsDriver({
  root: "/mnt/nfs/shared",
  publicUrl: "https://files.example.com",
});
```

## Security

### Directory Traversal Protection

The filesystem driver automatically sanitizes paths to prevent directory traversal attacks:

```typescript
// Malicious path attempt
await disk.put("../../../etc/passwd", "malicious");

// Sanitized to safe path
// Actually saves to: /var/uploads/etc/passwd
```

### Permissions

Ensure the Node.js process has appropriate permissions:

```bash
# Set ownership
sudo chown -R nodejs:nodejs /var/uploads

# Set permissions (read/write for owner, read for group)
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
- `getMetadata(path)` - Get metadata

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
  console.log(file.name, file.size, file.type);
}

// List with limit
for await (const file of disk.list("images/", { limit: 10 })) {
  console.log(file.href);
}
```

### Copy and Move

```typescript
// Copy file
await disk.copy("images/avatar.jpg", "backups/avatar.jpg");

// Move/rename file
await disk.move("temp/upload.jpg", "images/avatar.jpg");
```

### Stream Processing

```typescript
const file = await disk.get("video.mp4");
if (file) {
  const stream = file.stream();

  // Pipe to response
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
}
```

## Performance Considerations

### Large Files

For large files, use streaming to avoid loading entire file into memory:

```typescript
// Bad: Loads entire file into memory
const file = await disk.get("large-video.mp4");
const buffer = await file.arrayBuffer(); // May cause OOM

// Good: Stream the file
const file = await disk.get("large-video.mp4");
const stream = file.stream();
// Process stream in chunks
```

### Concurrent Operations

The filesystem driver handles concurrent operations safely:

```typescript
// Safe - concurrent writes to different files
await Promise.all([disk.put("file1.txt", data1), disk.put("file2.txt", data2), disk.put("file3.txt", data3)]);
```

## Error Handling

```typescript
import { DiskFileNotFoundError, DiskWriteError, DiskReadError } from "@minimajs/disk";

try {
  await disk.get("missing.txt");
} catch (error) {
  if (error instanceof DiskFileNotFoundError) {
    console.log("File not found");
  }
}

try {
  await disk.put("readonly/file.txt", data);
} catch (error) {
  if (error instanceof DiskWriteError) {
    console.log("Permission denied or disk full");
  }
}
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
- [Examples](./examples.md)
