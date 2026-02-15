# Protocol Disk

Multi-driver routing with prefix-based matching. Route storage operations to different drivers based on URL prefixes with automatic longest-match-first algorithm.

## Features

- 🎯 **Prefix-Based Routing** - Route by protocol, bucket, domain, or any prefix
- 🔍 **Longest Match First** - Most specific prefix automatically wins
- 🔀 **Cross-Storage** - Seamlessly copy/move between different drivers
- ⚡ **Optimized Operations** - Uses native driver operations when possible
- 🌊 **Streaming** - Efficient cross-driver transfers without buffering

## Installation

```bash
npm install @minimajs/disk
# Plus any drivers you need
npm install @minimajs/aws-s3
```

## Basic Usage

```typescript
import { createProtocolDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";

const disk = createProtocolDisk({
  protocols: {
    "file://": createFsDriver({ root: "/var/uploads" }),
    "s3://": createS3Driver({ region: "us-east-1" }),
  },
  defaultProtocol: "file://",
});

// Routes to filesystem driver
await disk.put("file:///tmp/local.txt", "local data");

// Routes to S3 driver
await disk.put("s3://my-bucket/remote.txt", "remote data");

// Uses default protocol (file://)
await disk.put("uploads/avatar.jpg", imageData);
```

## Longest Prefix Matching

More specific prefixes take precedence:

```typescript
const disk = createProtocolDisk({
  protocols: {
    "s3://": generalS3Driver, // Matches: s3://anything/
    "s3://images-bucket/": imagesDriver, // Matches: s3://images-bucket/*
    "s3://videos-bucket/": videosDriver, // Matches: s3://videos-bucket/*
  },
});

// Routes to imagesDriver (longest match: "s3://images-bucket/")
await disk.put("s3://images-bucket/photo.jpg", imageData);

// Routes to videosDriver (longest match: "s3://videos-bucket/")
await disk.put("s3://videos-bucket/clip.mp4", videoData);

// Routes to generalS3Driver (only matches: "s3://")
await disk.put("s3://other-bucket/file.txt", data);
```

## Use Cases

### Multi-Bucket S3

Different configurations per bucket:

```typescript
import { createProtocolDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";

const disk = createProtocolDisk({
  protocols: {
    "s3://images-prod/": createS3Driver({
      bucket: "images-prod",
      region: "us-east-1",
    }),
    "s3://videos-prod/": createS3Driver({
      bucket: "videos-prod",
      region: "us-west-2",
    }),
    "s3://archive/": createS3Driver({
      bucket: "archive",
      region: "us-east-1",
      // storageClass: "GLACIER",
    }),
  },
});

// Each bucket handled by its driver
await disk.put("s3://images-prod/avatar.jpg", imageData);
await disk.put("s3://videos-prod/intro.mp4", videoData);

// Cross-bucket move (different drivers)
await disk.move("s3://images-prod/old.jpg", "s3://archive/old.jpg");
```

### Multi-CDN Setup

Route to different CDN providers:

```typescript
const disk = createProtocolDisk({
  protocols: {
    "https://cdn1.example.com/": azureDriver,
    "https://cdn2.example.com/": cloudflareDriver,
    "https://cdn3.example.com/": awsDriver,
  },
});

// Routes to Azure
await disk.put("https://cdn1.example.com/logo.png", logoData);

// Routes to Cloudflare
await disk.put("https://cdn2.example.com/banner.png", bannerData);

// Copy between CDNs
await disk.copy("https://cdn1.example.com/logo.png", "https://cdn2.example.com/logo.png");
```

### Environment-Based Routing

```typescript
const disk = createProtocolDisk({
  protocols: {
    "s3://prod/": prodS3Driver,
    "s3://staging/": stagingS3Driver,
    "file:///tmp/dev/": devFsDriver,
  },
  defaultProtocol: process.env.NODE_ENV === "production" ? "s3://prod/" : "file:///tmp/dev/",
});

// Uses environment-appropriate storage
await disk.put("uploads/file.txt", data);
```

### Tiered Storage

Hot/warm/cold data storage:

```typescript
const disk = createProtocolDisk({
  protocols: {
    "s3://hot-data/": createS3Driver({ bucket: "hot-data" }),
    "s3://warm-data/": createS3Driver({ bucket: "warm-data" }),
    "s3://cold-data/": createS3Driver({ bucket: "cold-data" }),
    "file:///cache/": cacheDriver,
  },
});

// Recent files in hot storage
await disk.put("s3://hot-data/recent/file.jpg", data);

// Cache locally for fast access
await disk.copy("s3://hot-data/recent/file.jpg", "file:///cache/file.jpg");

// Archive old files
await disk.move("s3://hot-data/old/file.jpg", "s3://cold-data/archive/file.jpg");
```

### Multi-Tenant Storage

Separate storage per tenant:

```typescript
const disk = createProtocolDisk({
  protocols: {
    "s3://tenant-acme/": acmeTenantDriver,
    "s3://tenant-bigco/": bigcoTenantDriver,
    "s3://tenant-startup/": startupTenantDriver,
  },
});

// Each tenant isolated
await disk.put(`s3://tenant-${tenantId}/uploads/file.txt`, data);
```

## Cross-Driver Operations

### Automatic Streaming

When copying/moving between different prefixes (drivers), data is **streamed**:

```typescript
// Streams from S3 images bucket to videos bucket
await disk.copy("s3://images-bucket/file.jpg", "s3://videos-bucket/file.jpg");

// Streams from S3 to local filesystem
await disk.copy("s3://images-bucket/file.jpg", "file:///tmp/file.jpg");
```

### Native Operations

When source and destination use the **same driver**, native operations are used (faster):

```typescript
// Uses native S3 copy (server-side, no download/upload)
await disk.copy("s3://images-bucket/a.jpg", "s3://images-bucket/b.jpg");

// Uses cross-driver streaming (different drivers)
await disk.copy("s3://images-bucket/a.jpg", "s3://videos-bucket/a.jpg");
```

## Configuration

```typescript
interface ProtocolDiskOptions {
  /**
   * Map of URL prefixes to their respective drivers
   * Longer prefixes are matched first (most specific wins)
   */
  protocols: Record<string, DiskDriver>;

  /**
   * Default prefix to use for relative paths
   * @default "file://"
   */
  defaultProtocol?: string;

  /**
   * Base path for resolving relative paths
   * @default process.cwd()
   */
  basePath?: string;
}
```

## API

All standard [Disk operations](./index.md#api-reference) are supported:

- `put(path, data, options?)` - Store files
- `get(path)` - Retrieve files
- `delete(path)` - Delete files
- `exists(path)` - Check existence
- `copy(from, to)` - Copy files (cross-driver support)
- `move(from, to)` - Move files (cross-driver support)
- `list(prefix?, options?)` - List files
- `url(path, options?)` - Generate URLs
- `getMetadata(path)` - Get metadata

## How Routing Works

1. **Extract prefix from path** - Get the protocol/domain/bucket part
2. **Sort registered prefixes by length** - Longest first
3. **Match against sorted list** - First match wins
4. **Route to matched driver** - Execute operation

```typescript
// Given these prefixes (sorted internally):
// 1. "s3://images-bucket/" (19 chars)
// 2. "s3://" (5 chars)

// Path: "s3://images-bucket/photo.jpg"
// Matches: "s3://images-bucket/" ✓ (longest match)
// Routes to: imagesDriver

// Path: "s3://other-bucket/file.txt"
// Matches: "s3://" ✓ (only match)
// Routes to: generalS3Driver
```

## Benefits

1. **Granular Control** - Route at bucket/domain/path level
2. **Automatic Matching** - Longest prefix wins automatically
3. **Seamless Cross-Storage** - Copy/move between any prefixes
4. **Performance** - Native operations when possible
5. **Streaming** - No memory buffering for transfers
6. **Flexible** - Mix and match strategies
7. **Cost Optimization** - Route to cheaper storage as needed
8. **Multi-Tenant** - Isolate storage per tenant

## Examples

### Hybrid Storage Strategy

```typescript
const disk = createProtocolDisk({
  protocols: {
    // Frequently accessed files on CDN
    "https://cdn.example.com/": cdnDriver,
    // Large media files on S3
    "s3://media/": s3MediaDriver,
    // User uploads on S3
    "s3://uploads/": s3UploadsDriver,
    // Local cache
    "file:///cache/": cacheDriver,
  },
  defaultProtocol: "s3://uploads/",
});

// Upload to S3
const uploaded = await disk.put("avatar.jpg", imageData);
// s3://uploads/avatar.jpg

// Copy to CDN for fast access
await disk.copy(uploaded, "https://cdn.example.com/avatars/user123.jpg");

// Cache locally for processing
await disk.copy(uploaded, "file:///cache/avatar.jpg");
```

### Development vs Production

```typescript
function createStorageDisk() {
  if (process.env.NODE_ENV === "production") {
    return createProtocolDisk({
      protocols: {
        "s3://prod-bucket/": createS3Driver({
          bucket: "prod-bucket",
          region: "us-east-1",
        }),
      },
      defaultProtocol: "s3://prod-bucket/",
    });
  }

  // Development: use local filesystem
  return createProtocolDisk({
    protocols: {
      "file:///tmp/dev/": createFsDriver({ root: "/tmp/dev" }),
    },
    defaultProtocol: "file:///tmp/dev/",
  });
}

// Same code works in both environments
const disk = createStorageDisk();
await disk.put("uploads/file.txt", data);
```

## See Also

- [Main Documentation](./index.md)
- [AWS S3 Driver](./aws-s3.md)
- [Filesystem Driver](./filesystem.md)
- [Examples](./examples.md)
