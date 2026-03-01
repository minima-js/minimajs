# AWS S3 Driver

**AWS S3 storage driver for `@minimajs/disk`.** Keep your application code on web-native File APIs while using S3 for durable, scalable storage.

## Features

- 🌐 **Web-Native APIs** - Use File, Blob, ReadableStream instead of AWS SDK methods
- ✅ **Streaming Uploads** - Efficient streaming uploads to S3
- ✅ **Streaming Downloads** - Direct streaming from S3 without buffering
- ✅ **CloudFront Integration** - Configure CDN URLs for public file serving
- ✅ **Metadata Support** - Store and retrieve custom metadata
- ✅ **Server-Side Copy** - Fast native S3 copy operations
- ✅ **List Operations** - Paginated file listing with prefix support
- ✅ **Storage Classes** - Support for all S3 tiers (Standard, IA, Glacier)
- ✅ **Encryption** - AES256 and KMS encryption support
- ✅ **ACL Support** - Control file access permissions
- ✅ **Minimal Dependencies** - Only requires @aws-sdk/client-s3

## Best Fit

Choose the S3 driver when you need:

- durable storage across deployments and regions
- large-scale object storage with lifecycle policies
- CDN-backed delivery (CloudFront or custom public URL)
- IAM, KMS, and compliance-oriented controls

## Installation

```bash
npm install @minimajs/aws-s3 @minimajs/disk
# or
bun add @minimajs/aws-s3 @minimajs/disk
```

## Usage

### Basic Configuration

```typescript
import { createS3Driver } from "@minimajs/aws-s3";
import { createDisk } from "@minimajs/disk";

// Create S3 disk - driver is required for S3
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

// Web-native API - works like browser File API
const file = new File(["Hello World"], "hello.txt");
await disk.put(file); // Stored as "hello.txt" (original filename preserved)

// Use storeAs(...) plugin if you want UUID naming
// import { storeAs } from "@minimajs/disk/plugins";
// const disk = createDisk({ driver: createS3Driver({...}) }, storeAs("uuid"));

// Or specify path
await disk.put("uploads/avatar.jpg", imageBuffer);

// Retrieve file - standard File methods
const retrieved = await disk.get("uploads/avatar.jpg");
if (retrieved) {
  const buffer = await retrieved.arrayBuffer(); // Standard File.arrayBuffer()
  const blob = await retrieved.blob(); // Standard File.blob()
  const text = await retrieved.text(); // Standard File.text()
  const stream = retrieved.stream(); // Standard File.stream()
}

// Delete file
await disk.delete("uploads/avatar.jpg");
```

::: tip Default Filesystem Driver
`createDisk()` defaults to a filesystem driver with `process.cwd()` as root when no driver is specified.
Only use `createFsDriver()` if you need to customize the root directory or publicUrl.

```typescript
// Default filesystem (uses current working directory)
const defaultDisk = createDisk();

// Custom filesystem root
import { createFsDriver } from "@minimajs/disk/adapters";
const customDisk = createDisk({
  driver: createFsDriver({
    root: "./uploads",
    publicUrl: "https://example.com/files",
  }),
});
```

:::

### Multi-Bucket Setup

When bucket is NOT configured in the driver, use full `s3://` URLs:

```typescript
const disk = createDisk({
  driver: createS3Driver({
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

// Specify bucket in URL
await disk.put("s3://bucket-1/file.txt", "Data for bucket 1");
await disk.put("s3://bucket-2/file.txt", "Data for bucket 2");

// Retrieve from specific bucket
const file = await disk.get("s3://bucket-1/file.txt");
```

### CloudFront CDN Integration

For public file serving via CloudFront CDN:

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    publicUrl: "https://d1234567890.cloudfront.net", // CloudFront distribution URL
    acl: "public-read", // Make files publicly accessible
  }),
});

await disk.put("images/logo.png", logoBuffer);

// Get CloudFront URL
const url = await disk.url("images/logo.png");
console.log(url); // https://d1234567890.cloudfront.net/images/logo.png
```

### Public S3 URLs

For public buckets without CloudFront:

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-public-bucket",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    acl: "public-read", // Makes files publicly accessible
  }),
});

await disk.put("avatar.jpg", imageBuffer);

// Get public S3 URL
const url = await disk.url("avatar.jpg");
console.log(url);
// https://my-public-bucket.s3.us-east-1.amazonaws.com/avatar.jpg
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
   * Public URL for serving files (e.g., CloudFront CDN URL)
   * When set, disk.url() returns URLs with this prefix
   */
  publicUrl?: string;

  /**
   * Base prefix/path within the bucket
   * All file operations will be prefixed with this path
   */
  prefix?: string;
}
```

## Examples

### Upload with Metadata

```typescript
await disk.put("documents/report.pdf", pdfBuffer, {
  type: "application/pdf",
  metadata: {
    author: "John Doe",
    department: "Finance",
    year: "2024",
  },
});

// Retrieve with metadata
const file = await disk.get("documents/report.pdf");
console.log(file.type); // "application/pdf"
console.log(file.metadata); // { author: "John Doe", department: "Finance", year: "2024" }
```

### Using Web-Native File Objects

```typescript
// Upload File directly - auto-generates unique filename
const textFile = new File(["Hello World"], "greeting.txt", {
  type: "text/plain",
});
await disk.put(textFile);

// Upload with custom path
const imageFile = new File([imageBuffer], "photo.jpg", {
  type: "image/jpeg",
});
await disk.put("uploads/2024/photo.jpg", imageFile);

// Upload Blob
const blob = new Blob(["JSON data"], { type: "application/json" });
await disk.put("data/config.json", blob);
```

### Storage Classes

```typescript
// Standard storage (default)
const standardDisk = createDisk({
  driver: createS3Driver({
    bucket: "hot-data",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

// Infrequent Access (cheaper for rarely accessed files)
const coldDisk = createDisk({
  driver: createS3Driver({
    bucket: "cold-data",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    storageClass: "STANDARD_IA",
  }),
});

// Glacier (archive storage, very cheap but slow retrieval)
const archiveDisk = createDisk({
  driver: createS3Driver({
    bucket: "archive",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    storageClass: "GLACIER",
  }),
});
```

### Encryption

```typescript
// AES256 server-side encryption
const encryptedDisk = createDisk({
  driver: createS3Driver({
    bucket: "secure-bucket",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    serverSideEncryption: "AES256",
  }),
});

// KMS encryption
const kmsDisk = createDisk({
  driver: createS3Driver({
    bucket: "very-secure-bucket",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    serverSideEncryption: "aws:kms",
  }),
});
```

### List Files

```typescript
// List all files with prefix
for await (const file of disk.list("uploads/2024/")) {
  console.log(file.name, file.size, file.lastModified);
  console.log(file.href); // s3://my-bucket/uploads/2024/photo.jpg
}

// List with limit
for await (const file of disk.list("uploads/", { limit: 100 })) {
  console.log(file.href);
}

// Get file metadata while listing
for await (const file of disk.list("documents/")) {
  console.log(file.type); // MIME type
  console.log(file.metadata); // Custom metadata
}
```

### Copy Between Buckets

```typescript
import { createProtoDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
};

const disk = createProtoDisk({
  protocols: {
    "s3://prod/": createS3Driver({
      bucket: "prod-bucket",
      region: "us-east-1",
      credentials,
    }),
    "s3://backup/": createS3Driver({
      bucket: "backup-bucket",
      region: "us-west-2",
      credentials,
    }),
  },
});

// Server-side copy within same bucket (fast)
await disk.copy("s3://prod/file.jpg", "s3://prod/backup/file.jpg");

// Streaming copy between different buckets
await disk.copy("s3://prod/file.jpg", "s3://backup/file.jpg");
```

### CloudFront CDN URLs

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    publicUrl: "https://d1234567890.cloudfront.net",
    acl: "public-read",
  }),
});

// Upload to S3
await disk.put("images/logo.png", logoBuffer);

// Get CloudFront URL
const cdnUrl = await disk.url("images/logo.png");
console.log(cdnUrl);
// https://d1234567890.cloudfront.net/images/logo.png
```

## S3-Compatible Services

Works with MinIO, DigitalOcean Spaces, Cloudflare R2, and other S3-compatible services:

### MinIO

```typescript
import { createS3Driver } from "@minimajs/aws-s3";
import { createDisk } from "@minimajs/disk";

const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    endpoint: "http://localhost:9000",
    forcePathStyle: true,
    credentials: {
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    },
  }),
});

// Use same web-native API
await disk.put("test.txt", "Hello MinIO");
const file = await disk.get("test.txt");
const text = await file.text();
```

### DigitalOcean Spaces

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-space",
    region: "nyc3",
    endpoint: "https://nyc3.digitaloceanspaces.com",
    credentials: {
      accessKeyId: process.env.SPACES_KEY!,
      secretAccessKey: process.env.SPACES_SECRET!,
    },
  }),
});
```

### Cloudflare R2

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  }),
});
```

## Performance Tips

### Streaming Large Files

Streaming is automatic and efficient:

```typescript
// Efficient - streams upload to S3
const largeFile = new File([largeBuffer], "video.mp4");
await disk.put("videos/large-video.mp4", largeFile);

// Efficient - streams download from S3
const downloaded = await disk.get("videos/large-video.mp4");
const readableStream = downloaded.stream(); // Standard ReadableStream

// Pipe to response (e.g., in HTTP server)
return new Response(readableStream, {
  headers: {
    "Content-Type": downloaded.type,
    "Content-Length": String(downloaded.size),
  },
});
```

### Concurrent Operations

S3 handles concurrent operations efficiently:

```typescript
// Upload multiple files in parallel
await Promise.all([disk.put("file1.txt", "Data 1"), disk.put("file2.txt", "Data 2"), disk.put("file3.txt", "Data 3")]);

// Download multiple files in parallel
const [file1, file2, file3] = await Promise.all([disk.get("file1.txt"), disk.get("file2.txt"), disk.get("file3.txt")]);
```

## Error Handling

```typescript
import { DiskFileNotFoundError, DiskWriteError, DiskReadError } from "@minimajs/disk";

try {
  const file = await disk.get("missing.txt");
} catch (error) {
  if (error instanceof DiskFileNotFoundError) {
    console.log("File not found in S3");
  } else if (error instanceof DiskReadError) {
    console.log("Failed to read from S3:", error.message);
  }
}

try {
  await disk.put("uploads/photo.jpg", imageBuffer);
} catch (error) {
  if (error instanceof DiskWriteError) {
    console.log("Failed to upload to S3:", error.message);
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

Then in your code:

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});
```

### IAM Roles (EC2/ECS/Lambda)

When running on AWS infrastructure, use IAM roles for automatic credential management:

```typescript
import { fromInstanceMetadata } from "@aws-sdk/credential-providers";
import { createS3Driver } from "@minimajs/aws-s3";
import { createDisk } from "@minimajs/disk";

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
import { createS3Driver } from "@minimajs/aws-s3";
import { createDisk } from "@minimajs/disk";

const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    credentials: fromIni({ profile: "my-profile" }),
  }),
});
```

## See Also

- [Core Disk Package](./index.md) - Main documentation
- [ProtoDisk](./protocol-disk.md) - Multi-cloud routing
- [Azure Blob Driver](./azure-blob.md) - Azure Blob Storage
- [Filesystem Driver](./filesystem.md) - Local filesystem storage
- [Decision Guide](./decision-guide.md) - Driver and plugin selection

## Key Benefits

- Use one application-level API across local, S3, and other drivers.
- Keep large uploads/downloads stream-first.
- Integrate cleanly with CloudFront and signed URL flows.
- Apply cross-cutting concerns through plugins, not bespoke middleware.
