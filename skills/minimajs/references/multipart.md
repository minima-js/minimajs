# @minimajs/multipart — File Upload Reference

## Schema-validated uploads (recommended)

The cleanest API — validates types, sizes, and MIME types, throws `ValidationError` (422) on failure:

```typescript
import { createMultipart } from "@minimajs/multipart/schema";
import { helpers } from "@minimajs/multipart";
import { z } from "zod";

const upload = createMultipart({
  name: z.string().min(1),
  avatar: z
    .file()
    .max(5 * 1024 * 1024) // 5MB max
    .mime(["image/jpeg", "image/png", "image/webp"]),
  photos: z.array(z.file().max(10_000_000)).max(10), // up to 10 photos
  description: z.string().optional(),
});

export const routes: Routes = {
  "POST /upload": async () => {
    const { name, avatar, photos } = await upload();
    const filename = await helpers.save(avatar, "./public/avatars");
    return { name, avatar: `/avatars/${filename}` };
  },
};
```

## Buffered API (`multipart` namespace)

Files are fully buffered into memory as Web API `File` objects:

```typescript
import { multipart } from "@minimajs/multipart";

// Single file by field name
const avatar = await multipart.file("avatar"); // File | null

// First file in the form
const [fieldName, file] = (await multipart.firstFile()) ?? [];

// Iterate all files
for await (const [fieldName, file] of multipart.files()) {
  console.log(fieldName, file.name, file.size, file.type);
  await helpers.save(file, "./uploads");
}

// Text fields only (no files)
const fields = await multipart.fields<{ name: string; email: string }>();

// Everything — files and fields together
for await (const [name, value] of multipart.body()) {
  if (helpers.isFile(value)) {
    await helpers.save(value, "./uploads");
  } else {
    console.log(name, value); // string
  }
}
```

All methods accept `MultipartOptions`:

```typescript
{
  limits?: {
    fileSize?: number;   // bytes
    files?: number;      // max file count
    fields?: number;     // max field count
    fieldSize?: number;  // max field value size
    parts?: number;      // max total parts
  };
  signal?: AbortSignal;  // from request.signal() for client disconnect
}
```

## Raw API (`raw` namespace)

Low-level access — files are raw streams (not buffered, not Web API File):

```typescript
import { raw } from "@minimajs/multipart";

// Raw file has .stream (Readable), .filename, .mimeType, .fieldname
const rawAvatar = await raw.file("avatar"); // MultipartRawFile | null

for await (const [field, rawFile] of raw.files()) {
  // Stream directly to storage without buffering
  await disk.put(rawFile.filename, rawFile.stream);
  // Or drain if you don't want the file
  await helpers.drain(rawFile);
}
```

## Streaming API (`streaming` namespace)

Returns `StreamFile` (extends `File`, lazily buffers from stream on first read):

```typescript
import { streaming } from "@minimajs/multipart";

// StreamFile by field name
const avatar = await streaming.file("avatar"); // StreamFile | null

// First file
const [fieldName, file] = (await streaming.firstFile()) ?? [];

// All fields (files as StreamFile, text as string)
for await (const [name, value] of streaming.body()) {
  if (value instanceof File) {
    await disk.put(value.name, value.stream());
  } else {
    console.log(name, value); // string
  }
}
```

## helpers

```typescript
import { helpers } from "@minimajs/multipart";

// Save a File or RawFile to disk
const filename = await helpers.save(file, "./uploads"); // uses file.name
const filename = await helpers.save(file, "./uploads", "custom.jpg"); // custom name

// Generate a unique filename preserving extension
const name = helpers.randomName("photo.jpg"); // "a1b2c3d4-....jpg"

// Ensure directory exists (mkdir -p)
await helpers.ensurePath("./uploads/avatars");

// Type guards
helpers.isFile(value); // instanceof File
helpers.isRawFile(value); // raw multipart file guard

// Convert raw stream to buffered File
const file = await helpers.raw2file(rawFile, { name: "upload.jpg" });

// Discard a raw stream (must drain to free resources)
await helpers.drain(rawFile);

// Human-readable file size
helpers.humanFileSize(1536000); // "1.5 MiB"

// ReadableStream to bytes
const bytes = await helpers.stream2bytes(stream);
```

## Combining with disk storage

```typescript
import { raw } from "@minimajs/multipart";
import { createDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";

const disk = createDisk({ driver: createS3Driver({ bucket: "uploads", region: "us-east-1" }) });

export const routes: Routes = {
  "POST /upload": async () => {
    for await (const [field, rawFile] of raw.files()) {
      const key = `uploads/${helpers.randomName(rawFile.filename)}`;
      await disk.put(key, rawFile.stream);
    }
    return { success: true };
  },
};
```
