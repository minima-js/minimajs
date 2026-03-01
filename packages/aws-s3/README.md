# @minimajs/aws-s3

AWS S3 driver for `@minimajs/disk`.

Use the Disk API (`put`, `get`, `list`, `copy`, `move`, `url`) with S3-backed storage.

## Installation

```bash
npm install @minimajs/aws-s3 @minimajs/disk
# or
bun add @minimajs/aws-s3 @minimajs/disk
```

## Quick start

```ts
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
    publicUrl: "https://cdn.example.com", // optional
  }),
});

await disk.put("uploads/avatar.jpg", imageBuffer);

const file = await disk.get("uploads/avatar.jpg");
if (file) {
  console.log(file.href); // s3://my-bucket/uploads/avatar.jpg
  console.log(await file.arrayBuffer());
}
```

## Bucket modes

### Single bucket (configured in driver)

When `bucket` is configured, use normal keys:

```ts
await disk.put("documents/report.pdf", pdfBuffer);
```

### Multi-bucket (bucket not configured)

When `bucket` is omitted, use full `s3://` hrefs:

```ts
const disk = createDisk({
  driver: createS3Driver({
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

await disk.put("s3://bucket-a/docs/a.txt", "A");
await disk.put("s3://bucket-b/docs/b.txt", "B");
```

## Protocol routing

```ts
import { createProtoDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";

const disk = createProtoDisk({
  protocols: {
    "s3://images/": createS3Driver({ bucket: "images", region: "us-east-1" }),
    "s3://videos/": createS3Driver({ bucket: "videos", region: "us-west-2" }),
  },
});

await disk.put("s3://images/photo.jpg", imageBuffer);
await disk.put("s3://videos/intro.mp4", videoBuffer);
```

## Driver options

`createS3Driver(options)` accepts:

```ts
interface S3DriverOptions {
  // from @minimajs/aws-s3
  bucket?: string;
  prefix?: string;
  acl?: ObjectCannedACL;
  storageClass?: StorageClass;
  serverSideEncryption?: ServerSideEncryption;
  publicUrl?: string;

  // from AWS S3ClientConfig
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  endpoint?: string;
  forcePathStyle?: boolean;
}
```

## URL behavior

- If `publicUrl` is set, `disk.url(path)` returns `publicUrl + key`.
- Otherwise, it returns the direct S3 URL for the object.

## Notes

- Metadata is supported (`capabilities.metadata = true`).
- `list(prefix, { recursive, limit })` is supported.
- Works with S3-compatible services via `endpoint` + `forcePathStyle`.

## Documentation

- https://minimajs.com/packages/disk/aws-s3

## License

MIT
