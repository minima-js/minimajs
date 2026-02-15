# @minimajs/disk Documentation

Universal disk storage abstraction with support for multiple storage backends.

## Documentation Index

### Getting Started

- **[Main Documentation](./index.md)** - Complete guide to using `@minimajs/disk`
  - Features & Installation
  - Quick Start
  - Core Concepts
  - API Reference
  - Error Handling

### Drivers

- **[Filesystem Driver](./filesystem.md)** - Local file storage
  - Configuration & Security
  - File storage structure
  - Performance considerations
  - Development usage

- **[AWS S3 Driver](./aws-s3.md)** - Amazon S3 and S3-compatible storage
  - Streaming uploads/downloads
  - Presigned URLs
  - Multi-bucket setup
  - Storage classes & encryption
  - CloudFront integration

- **[Memory Driver](./memory.md)** - In-memory storage for testing
  - Testing strategies
  - Stream behavior
  - When to use

### Advanced Features

- **[Protocol Disk](./protocol-disk.md)** - Multi-driver routing
  - Prefix-based routing
  - Longest-match algorithm
  - Cross-storage operations
  - Use cases:
    - Multi-bucket routing
    - Multi-CDN routing
    - Environment-based storage
    - Tiered storage
    - Multi-tenant systems

### Practical Guides

- **[Examples](./examples.md)** - Real-world usage patterns
  - Basic CRUD operations
  - Image processing workflows
  - PDF generation
  - File upload handling
  - Backup & synchronization
  - Testing strategies
  - Production patterns

## Quick Links

### Installation

```bash
npm install @minimajs/disk
```

### Basic Usage

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

### Available Drivers

| Driver     | Package                | Use Case    |
| ---------- | ---------------------- | ----------- |
| Filesystem | `@minimajs/disk`       | Development |
| Memory     | `@minimajs/disk`       | Testing     |
| AWS S3     | `@minimajs/aws-s3`     | Production  |
| Azure Blob | `@minimajs/azure-blob` | Production  |

## Features

- ✅ **Unified API** - Same interface for all storage backends
- ✅ **Type-Safe** - Full TypeScript support with strict types
- ✅ **Streaming** - Efficient handling of large files
- ✅ **Protocol Routing** - Route by URL prefix (s3://, file://, etc.)
- ✅ **Web Standards** - Works with File, Blob, and ReadableStream
- ✅ **Error Handling** - Typed error classes for better error management
- ✅ **Metadata** - Attach custom metadata to files
- ✅ **Testing** - Memory driver for fast unit tests

## Need Help?

- Check the [Main Documentation](./index.md) for comprehensive guide
- See [Examples](./examples.md) for practical usage patterns
- Review driver-specific docs for advanced features

## Contributing

Found an issue or want to contribute? Check out the main repository.
