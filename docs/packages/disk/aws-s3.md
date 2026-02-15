# AWS S3 Driver

AWS S3 storage driver for universal cloud storage. Store files on Amazon S3 with full streaming support and optional signed URLs.

## Features

- ✅ **Streaming Uploads** - Efficient streaming uploads to S3
- ✅ **Streaming Downloads** - Direct streaming from S3 without buffering
- ✅ **Presigned URLs** - Generate temporary signed URLs (optional)
- ✅ **Metadata Support** - Store and retrieve custom metadata
- ✅ **Server-Side Copy** - Fast native S3 copy operations
- ✅ **List Operations** - Paginated file listing with prefix support
- ✅ **Storage Classes** - Support for all S3 tiers (Standard, IA, Glacier)
- ✅ **Encryption** - AES256 and KMS encryption support
- ✅ **ACL Support** - Control file access permissions
- ✅ **Minimal Dependencies** - Only requires @aws-sdk/client-s3

## Installation

```bash
npm install @minimajs/aws-s3 @minimajs/disk
# or
bun add @minimajs/aws-s3 @minimajs/disk
```

**For presigned URL support** (optional):

```bash
npm install @aws-sdk/s3-request-presigner
```

> The presigner package is only loaded when generating signed URLs. For public buckets, you don't need it.

## Usage

### Basic Configuration

```typescript
import { createS3Driver } from "@minimajs/aws-s3";
import { createDisk } from "@minimajs/disk";

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

// Store file
const file = await disk.put("uploads/avatar.jpg", imageData);
console.log(file.href); // s3://my-bucket/uploads/avatar.jpg

// Retrieve file
const retrieved = await disk.get("uploads/avatar.jpg");
if (retrieved) {
  const buffer = await retrieved.arrayBuffer();
  const stream = retrieved.stream();
}

// Delete file
await disk.delete("uploads/avatar.jpg");
```

### Multi-Bucket Setup

When bucket is NOT configured, use full `s3://` URLs:

```typescript
const disk = createDisk({
  driver: createS3Driver({
    region: "us-east-1",
    credentials: {
      /* ... */
    },
  }),
});

// Specify bucket in path
await disk.put("s3://bucket-1/file.txt", data);
await disk.put("s3://bucket-2/file.txt", data);
```

### With Public URLs

For public buckets or signed URLs:

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-public-bucket",
    region: "us-east-1",
    credentials: {
      /* ... */
    },
    acl: "public-read", // Makes files publicly accessible
  }),
});

await disk.put("avatar.jpg", imageData);

// Get public URL
const url = await disk.url("avatar.jpg");
// https://my-public-bucket.s3.us-east-1.amazonaws.com/avatar.jpg
```

### Presigned URLs

For private buckets, generate temporary signed URLs:

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-private-bucket",
    region: "us-east-1",
    credentials: {
      /* ... */
    },
    // Don't set acl - files are private by default
  }),
});

await disk.put("document.pdf", pdfData);

// Generate signed URL (expires in 1 hour)
const url = await disk.url("document.pdf", {
  expiresIn: 3600,
});
// https://my-private-bucket.s3.amazonaws.com/document.pdf?X-Amz-...
```

## Configuration

```typescript
interface S3DriverOptions {
  /**
   * S3 bucket name (optional - can use s3:// URLs instead)
   */
  bucket?: string;

  /**
   * AWS region
   */
  region: string;

  /**
   * AWS credentials
   */
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };

  /**
   * Access Control List
   * @default "private"
   */
  acl?: "private" | "public-read" | "public-read-write" | "authenticated-read";

  /**
   * Storage class for new objects
   * @default "STANDARD"
   */
  storageClass?:
    | "STANDARD"
    | "REDUCED_REDUNDANCY"
    | "STANDARD_IA"
    | "ONEZONE_IA"
    | "INTELLIGENT_TIERING"
    | "GLACIER"
    | "DEEP_ARCHIVE";

  /**
   * Server-side encryption
   */
  encryption?: {
    type: "AES256" | "aws:kms";
    kmsKeyId?: string; // Required for aws:kms
  };

  /**
   * S3 client endpoint (for S3-compatible services)
   */
  endpoint?: string;

  /**
   * Force path-style URLs
   * @default false
   */
  forcePathStyle?: boolean;
}
```

## Examples

### Upload with Metadata

```typescript
await disk.put("documents/report.pdf", pdfData, {
  type: "application/pdf",
  metadata: {
    author: "John Doe",
    department: "Finance",
    year: "2024",
  },
});

// Retrieve with metadata
const file = await disk.get("documents/report.pdf");
console.log(file.metadata); // { author: "John Doe", ... }
```

### Storage Classes

```typescript
// Standard storage (default)
const standard = createS3Driver({
  bucket: "hot-data",
  region: "us-east-1",
  credentials: {
    /* ... */
  },
});

// Infrequent Access (cheaper for rarely accessed files)
const coldStorage = createS3Driver({
  bucket: "cold-data",
  region: "us-east-1",
  credentials: {
    /* ... */
  },
  storageClass: "STANDARD_IA",
});

// Glacier (archive storage, very cheap)
const archive = createS3Driver({
  bucket: "archive",
  region: "us-east-1",
  credentials: {
    /* ... */
  },
  storageClass: "GLACIER",
});
```

### Encryption

```typescript
// AES256 encryption
const encrypted = createS3Driver({
  bucket: "secure-bucket",
  region: "us-east-1",
  credentials: {
    /* ... */
  },
  encryption: {
    type: "AES256",
  },
});

// KMS encryption
const kmsEncrypted = createS3Driver({
  bucket: "very-secure-bucket",
  region: "us-east-1",
  credentials: {
    /* ... */
  },
  encryption: {
    type: "aws:kms",
    kmsKeyId: "arn:aws:kms:us-east-1:123456789:key/...",
  },
});
```

### List Files

```typescript
// List all files with prefix
for await (const file of disk.list("uploads/2024/")) {
  console.log(file.name, file.size, file.lastModified);
}

// List with limit
for await (const file of disk.list("uploads/", { limit: 100 })) {
  console.log(file.href);
}
```

### Copy Between Buckets

```typescript
import { createProtocolDisk } from "@minimajs/disk";

const disk = createProtocolDisk({
  protocols: {
    "s3://prod-bucket/": createS3Driver({ bucket: "prod-bucket", region: "us-east-1", credentials }),
    "s3://backup-bucket/": createS3Driver({ bucket: "backup-bucket", region: "us-west-2", credentials }),
  },
});

// Server-side copy within same bucket (fast)
await disk.copy("s3://prod-bucket/file.jpg", "s3://prod-bucket/backup/file.jpg");

// Streaming copy between buckets
await disk.copy("s3://prod-bucket/file.jpg", "s3://backup-bucket/file.jpg");
```

### CloudFront Integration

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    credentials: {
      /* ... */
    },
    acl: "public-read",
  }),
});

// Upload to S3
await disk.put("images/logo.png", logoData);

// Access via CloudFront
const cdnUrl = `https://d1234567890.cloudfront.net/images/logo.png`;
```

## S3-Compatible Services

Use with MinIO, DigitalOcean Spaces, or other S3-compatible services:

```typescript
// MinIO
const minioDriver = createS3Driver({
  bucket: "my-bucket",
  region: "us-east-1",
  endpoint: "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin",
  },
});

// DigitalOcean Spaces
const spacesDriver = createS3Driver({
  bucket: "my-space",
  region: "nyc3",
  endpoint: "https://nyc3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.SPACES_KEY!,
    secretAccessKey: process.env.SPACES_SECRET!,
  },
});
```

## Performance Tips

### Large Files

For large files, streaming is automatic:

```typescript
// Efficient - streams data
const file = await disk.put("large-video.mp4", largeFileStream);

// Efficient - streams download
const downloaded = await disk.get("large-video.mp4");
const stream = downloaded.stream();
```

### Concurrent Operations

S3 handles concurrent operations well:

```typescript
// Upload multiple files in parallel
await Promise.all([disk.put("file1.txt", data1), disk.put("file2.txt", data2), disk.put("file3.txt", data3)]);
```

## Error Handling

```typescript
import { DiskFileNotFoundError, DiskWriteError, DiskReadError } from "@minimajs/disk";

try {
  await disk.get("missing.txt");
} catch (error) {
  if (error instanceof DiskFileNotFoundError) {
    console.log("File not found in S3");
  } else if (error instanceof DiskReadError) {
    console.log("Failed to read from S3:", error.message);
  }
}
```

## AWS Credentials

### Environment Variables

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

### IAM Roles (EC2/ECS)

When running on AWS infrastructure, use IAM roles instead of credentials:

```typescript
import { fromInstanceMetadata } from "@aws-sdk/credential-providers";

const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    credentials: fromInstanceMetadata(),
  }),
});
```

### AWS Profile

```typescript
import { fromIni } from "@aws-sdk/credential-providers";

const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    credentials: fromIni({ profile: "my-profile" }),
  }),
});
```

## Comparison

| Feature       | S3              | Filesystem    | Memory     |
| ------------- | --------------- | ------------- | ---------- |
| Speed         | 🌐 Network      | 🚀 Fast       | ⚡ Fastest |
| Scalability   | ♾️ Unlimited    | 📦 Limited    | 🔒 RAM     |
| Redundancy    | ✅ Multi-region | ❌ Single     | ❌ None    |
| Cost          | 💰💰 Usage      | 💰 Storage    | Free       |
| Global Access | ✅ Worldwide    | ❌ Local only | ❌ Local   |
| Use Case      | Production      | Development   | Testing    |

## See Also

- [Main Documentation](./index.md)
- [Protocol Disk](./protocol-disk.md) - Multi-bucket routing
- [Filesystem Driver](./filesystem.md)
- [Examples](./examples.md)
