# @minimajs/aws-s3

AWS S3 storage driver for [@minimajs/disk](../disk).

## Features

- ✅ **Streaming uploads** - Efficient streaming uploads to S3
- ✅ **Streaming downloads** - Direct streaming from S3 without buffering
- ✅ **Presigned URLs** - Generate temporary signed URLs (optional peer dependency)
- ✅ **Metadata support** - Store and retrieve custom metadata
- ✅ **Server-side copy** - Fast native S3 copy operations
- ✅ **List operations** - Paginated file listing with prefix support
- ✅ **Storage classes** - Support for all S3 storage tiers (Standard, IA, Glacier, etc.)
- ✅ **Server-side encryption** - AES256 and KMS encryption
- ✅ **ACL support** - Control file access permissions
- ✅ **Minimal dependencies** - Only requires @aws-sdk/client-s3 core package

## Installation

```bash
npm install @minimajs/aws-s3 @minimajs/disk
# or
bun add @minimajs/aws-s3 @minimajs/disk
```

**For presigned URL support**, also install:

```bash
npm install @aws-sdk/s3-request-presigner
# or
bun add @aws-sdk/s3-request-presigner
```

> **Note:** The presigner package is optional and only loaded when generating presigned URLs. If you only use public buckets, you don't need it.

## Basic Usage

### With Bucket in Driver Config

When bucket is configured in the driver, use simple key paths:

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

// Use simple key paths
const file = await disk.put("uploads/avatar.jpg", imageData);
console.log(file.href); // s3://my-bucket/uploads/avatar.jpg

// Download file
const downloaded = await disk.get("uploads/avatar.jpg");
if (downloaded) {
  const stream = await downloaded.stream();
  // Use stream...
}

// Delete file
await disk.delete("uploads/avatar.jpg");
```

### Without Bucket (Multi-Bucket)

When bucket is NOT configured, use full `s3://` URLs:

```typescript
import { createS3Driver } from "@minimajs/aws-s3";
import { createDisk } from "@minimajs/disk";

const disk = createDisk({
  driver: createS3Driver({
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

// Must use s3:// protocol when bucket is not configured
const file1 = await disk.put("s3://bucket-1/uploads/avatar.jpg", imageData);
const file2 = await disk.put("s3://bucket-2/docs/report.pdf", pdfData);

console.log(file1.href); // s3://bucket-1/uploads/avatar.jpg
console.log(file2.href); // s3://bucket-2/docs/report.pdf
```

### Multi-Bucket Setup with Protocol Disk

```typescript
import { createS3Driver } from "@minimajs/aws-s3";
import { createProtocolDisk } from "@minimajs/disk";

const imagesDriver = createS3Driver({
  bucket: "images-bucket",
  region: "us-east-1",
  acl: "public-read",
  storageClass: "STANDARD",
});

const videosDriver = createS3Driver({
  bucket: "videos-bucket",
  region: "us-west-2",
  storageClass: "STANDARD_IA",
});

const archiveDriver = createS3Driver({
  bucket: "archive-bucket",
  region: "us-east-1",
  storageClass: "GLACIER",
});

const disk = createProtocolDisk({
  protocols: {
    "s3://images-bucket/": imagesDriver,
    "s3://videos-bucket/": videosDriver,
    "s3://archive-bucket/": archiveDriver,
  },
});

// Upload to specific buckets
await disk.put("s3://images-bucket/photo.jpg", imageData);
await disk.put("s3://videos-bucket/video.mp4", videoData);

// Cross-bucket copy (streams between buckets)
await disk.copy("s3://images-bucket/photo.jpg", "s3://archive-bucket/old-photos/photo.jpg");
```

## Configuration

### S3DriverOptions

```typescript
interface S3DriverOptions {
  /** S3 bucket name */
  bucket: string;

  /** AWS region (e.g., 'us-east-1') */
  region: string;

  /** AWS credentials */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };

  /** Base prefix/path within the bucket */
  prefix?: string;

  /** Default ACL for uploaded objects */
  acl?: ObjectCannedACL;

  /** Default storage class */
  storageClass?: StorageClass;

  /** Server-side encryption */
  serverSideEncryption?: ServerSideEncryption;

  /** CDN URL (e.g., 'https://cdn.example.com' or 'https://d1234567890.cloudfront.net') */
  cdnUrl?: string;

  /** Part size for multipart uploads (default: 5MB) */
  partSize?: number;

  /** Queue size for multipart uploads (default: 4) */
  queueSize?: number;

  /** Custom S3 endpoint (for S3-compatible services) */
  endpoint?: string;

  /** Force path style URLs */
  forcePathStyle?: boolean;
}
```

## Advanced Examples

### With Prefix

```typescript
const driver = createS3Driver({
  bucket: "my-bucket",
  region: "us-east-1",
  prefix: "uploads", // All files go under /uploads
});

const disk = createDisk({ driver });

await disk.put("avatar.jpg", imageData);
// Stored at: s3://my-bucket/uploads/avatar.jpg
```

### With Custom Metadata

```typescript
await disk.put("document.pdf", pdfData, {
  metadata: {
    userId: "12345",
    uploadedFrom: "web",
    version: "2.0",
  },
  cacheControl: "max-age=31536000",
});

const file = await disk.getMetadata("document.pdf");
console.log(file?.metadata); // { userId: '12345', ... }
```

### Generate Presigned URLs

```typescript
// Public URL (for public-read buckets)
const publicUrl = await disk.url("public-file.jpg");

// Presigned URL (expires in 1 hour)
const signedUrl = await disk.url("private-file.jpg", {
  expiresIn: 3600,
});

// Download URL with custom filename
const downloadUrl = await disk.url("report.pdf", {
  expiresIn: 3600,
  download: "Monthly-Report.pdf",
});
```

### List Files

```typescript
// List all files
for await (const file of disk.list()) {
  console.log(file.href, file.size, file.lastModified);
}

// List with prefix
for await (const file of disk.list("s3://my-bucket/uploads/")) {
  console.log(file.href);
}

// List recursively with limit
for await (const file of disk.list("s3://my-bucket/photos/", {
  recursive: true,
  limit: 100,
})) {
  console.log(file.href);
}
```

### Storage Classes & Lifecycle

```typescript
// Hot data - frequent access
const hotDriver = createS3Driver({
  bucket: "data-bucket",
  region: "us-east-1",
  storageClass: "STANDARD",
});

// Warm data - infrequent access
const warmDriver = createS3Driver({
  bucket: "data-bucket",
  region: "us-east-1",
  storageClass: "STANDARD_IA",
});

// Cold data - archive
const coldDriver = createS3Driver({
  bucket: "data-bucket",
  region: "us-east-1",
  storageClass: "GLACIER",
});

const disk = createProtocolDisk({
  protocols: {
    "s3://data-bucket/hot/": hotDriver,
    "s3://data-bucket/warm/": warmDriver,
    "s3://data-bucket/cold/": coldDriver,
  },
});

// Upload to appropriate tier
await disk.put("s3://data-bucket/hot/recent-data.json", recentData);
await disk.put("s3://data-bucket/cold/archive-2020.zip", archiveData);
```

### S3-Compatible Services (MinIO, DigitalOcean Spaces, etc.)

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

1. **Multipart Uploads**: Automatically used for streaming uploads
2. **Part Size**: Adjust `partSize` for large files (default: 5MB)
3. **Queue Size**: Adjust `queueSize` for parallel uploads (default: 4)
4. **Server-Side Copy**: Same-bucket copies use native S3 copy (fast)
5. **Presigned URLs**: Use for large downloads to avoid proxy overhead

## Environment Variables

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_SESSION_TOKEN=optional-session-token

# S3 Configuration
S3_BUCKET=my-bucket
S3_PREFIX=uploads
S3_ACL=public-read
```

## IAM Permissions

Minimum required IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObjectMetadata"],
      "Resource": ["arn:aws:s3:::my-bucket/*", "arn:aws:s3:::my-bucket"]
    }
  ]
}
```

## License

MIT
