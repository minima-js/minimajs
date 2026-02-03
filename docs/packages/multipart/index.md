---
title: Multipart
sidebar_position: 3
---

# Multipart File Uploads

The `@minimajs/multipart` package provides multiple APIs for handling multipart form data with different memory strategies.

## Installation

```bash
npm install @minimajs/multipart
```

## Overview

The package provides four modules for different use cases:

| Module      | Memory      | Use Case                          |
| ----------- | ----------- | --------------------------------- |
| `multipart` | Buffered    | Simple uploads, small files       |
| `streaming` | Lazy buffer | Large files with File API         |
| `raw`       | Unbuffered  | Advanced use cases, custom piping |
| `schema`    | Disk-backed | Validated uploads with Zod        |

## Quick Start

### Simple File Upload

```typescript
import { multipart, helpers } from "@minimajs/multipart";

export async function uploadAvatar() {
  const avatar = await multipart.file("avatar");

  if (!avatar) {
    return { error: "No file uploaded" };
  }

  await helpers.save(avatar, "./uploads/avatars");
  return { success: true, filename: avatar.name };
}
```

### Streaming Large Files

For large files, use the `raw` module to stream directly without memory buffering:

```typescript
import { raw, helpers } from "@minimajs/multipart";

export async function uploadVideo() {
  const video = await raw.file("video");

  if (!video) {
    return { error: "No video uploaded" };
  }

  await helpers.save(video, "./uploads/videos");
  return { filename: video.filename };
}
```

### Validated Uploads with Zod

For type-safe validation, use the schema module:

```typescript
import { z } from "zod";
import { createMultipart } from "@minimajs/multipart/schema";
import { helpers } from "@minimajs/multipart";

const upload = createMultipart({
  name: z.string().min(1),
  avatar: z
    .file()
    .mime(["image/jpeg", "image/png"])
    .max(5 * 1024 * 1024),
});

export async function handleUpload() {
  const data = await upload();
  await helpers.save(data.avatar, "./uploads");
  return { name: data.name };
}
```

## multipart Module (Buffered)

Standard approach that loads files into memory as Web API `File` objects. Best for small files.

### `multipart.file(name, options?)`

Retrieves a single file by field name.

```typescript
import { multipart } from "@minimajs/multipart";

const avatar = await multipart.file("avatar");
if (avatar) {
  console.log(avatar.name); // filename
  console.log(avatar.type); // MIME type
  console.log(avatar.size); // bytes
}
```

**Returns:** `Promise<File | null>`

### `multipart.firstFile(options?)`

Retrieves the first file from the request.

```typescript
const result = await multipart.firstFile();
if (result) {
  const [fieldName, file] = result;
  console.log(`${file.name} from field ${fieldName}`);
}
```

**Returns:** `Promise<[field: string, file: File] | null>`

### `multipart.files(options?)`

Iterates over all files in the request.

```typescript
for await (const [field, file] of multipart.files()) {
  console.log(`${field}: ${file.name}`);
  await helpers.save(file, "./uploads");
}
```

**Returns:** `AsyncGenerator<[field: string, file: File]>`

### `multipart.fields<T>()`

Retrieves all text fields (files are ignored).

```typescript
const fields = await multipart.fields<{ name: string; email: string }>();
console.log(fields.name, fields.email);
```

**Returns:** `Promise<T>`

### `multipart.body(options?)`

Iterates over both fields and files.

```typescript
import { helpers } from "@minimajs/multipart";

for await (const [name, value] of multipart.body()) {
  if (helpers.isFile(value)) {
    await helpers.save(value, "./uploads");
  } else {
    console.log(`${name}: ${value}`);
  }
}
```

**Returns:** `AsyncGenerator<[field: string, value: string | File]>`

## streaming Module (Lazy Buffer)

**Recommended for large files.** Returns `StreamFile` instances that don't load into memory until accessed. Stream directly to disk without buffering.

### `streaming.file(name, options?)`

```typescript
import { streaming } from "@minimajs/multipart";

const file = await streaming.file("video");

// Not buffered - access metadata immediately
console.log(file.name, file.type);

// Stream directly to disk (no memory buffering)
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

await pipeline(file.stream(), createWriteStream("./uploads/video.mp4"));
```

**Returns:** `Promise<StreamFile | null>`

### `streaming.firstFile(options?)`

```typescript
const result = await streaming.firstFile();
if (result) {
  const [field, file] = result;
  const buffer = await file.arrayBuffer();
}
```

**Returns:** `Promise<[field: string, file: StreamFile] | null>`

### `streaming.body(options?)`

```typescript
for await (const [name, value] of streaming.body()) {
  if (typeof value !== "string") {
    // StreamFile - buffers on read
    const content = await value.text();
  }
}
```

**Returns:** `AsyncGenerator<[field: string, value: string | StreamFile]>`

### StreamFile API

```typescript
class StreamFile extends File {
  stream(): ReadableStream; // Web stream (one-time use)
  bytes(): Promise<Uint8Array>; // Buffer and return
  text(): Promise<string>; // Decode as UTF-8
  arrayBuffer(): Promise<ArrayBuffer>;
  toReadable(): Readable | null; // Node.js stream
  toFile(): Promise<File>; // Convert to standard File
}
```

## raw Module (Advanced)

Low-level access to busboy streams for advanced use cases. For most large file handling, prefer `streaming` module instead.

### `raw.file(name, options?)`

```typescript
import { raw, helpers } from "@minimajs/multipart";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

const video = await raw.file("video");
if (video) {
  await pipeline(video.stream, createWriteStream(`./uploads/${video.filename}`));
}
```

**Returns:** `Promise<MultipartRawFile | null>`

### `raw.firstFile(options?)`

```typescript
const file = await raw.firstFile();
if (file) {
  await helpers.save(file, "./uploads");
}
```

**Returns:** `Promise<MultipartRawFile | null>`

### `raw.files(options?)`

```typescript
for await (const file of raw.files()) {
  await helpers.save(file, "./uploads");
}
```

**Returns:** `AsyncGenerator<MultipartRawFile>`

### `raw.body(options?)`

```typescript
import { helpers } from "@minimajs/multipart";

for await (const item of raw.body()) {
  if (helpers.isRawFile(item)) {
    await helpers.save(item, "./uploads");
  } else {
    console.log(`${item.fieldname}: ${item.value}`);
  }
}
```

**Returns:** `AsyncGenerator<MultipartRawResult>`

### Raw Types

```typescript
interface MultipartRawFile {
  fieldname: string;
  filename: string;
  mimeType: string;
  transferEncoding: string;
  stream: BusboyFileStream;
  [RAW_FILE]: true;
}

interface MultipartRawField {
  fieldname: string;
  value: string;
  [RAW_FIELD]: true;
}

type MultipartRawResult = MultipartRawFile | MultipartRawField;
```

## helpers Module

Utility functions for file handling.

### `helpers.save(file, dest, filename?)`

Saves a file to disk. Works with `File`, `StreamFile`, `TempFile`, or `MultipartRawFile`.

```typescript
import { helpers } from "@minimajs/multipart";

// Auto-generated UUID filename
const name = await helpers.save(file, "./uploads");
// Returns: "550e8400-e29b-41d4-a716-446655440000.jpg"

// Custom filename
await helpers.save(file, "./uploads", "avatar.jpg");
```

### `helpers.isFile(value)`

Type guard for Web API `File`.

```typescript
if (helpers.isFile(value)) {
  console.log(value.name, value.size);
}
```

### `helpers.isRawFile(value)`

Type guard for raw multipart files.

```typescript
if (helpers.isRawFile(value)) {
  await pipeline(value.stream, destination);
}
```

### `helpers.isRawField(value)`

Type guard for raw multipart fields.

```typescript
if (helpers.isRawField(value)) {
  console.log(value.fieldname, value.value);
}
```

### `helpers.drain(rawFile)`

Consumes and discards a raw file stream.

```typescript
// Skip unwanted files
await helpers.drain(rawFile);
```

### `helpers.randomName(filename)`

Generates UUID filename preserving extension.

```typescript
helpers.randomName("photo.jpg");
// "550e8400-e29b-41d4-a716-446655440000.jpg"
```

### `helpers.ensurePath(...paths)`

Creates directory if it doesn't exist.

```typescript
await helpers.ensurePath("./uploads", "avatars");
```

### `helpers.humanFileSize(bytes, decimals?)`

Converts bytes to human-readable format.

```typescript
helpers.humanFileSize(1048576); // "1.0 MiB"
helpers.humanFileSize(1536, 2); // "1.50 KiB"
```

## Configuration Options

All modules accept `MultipartOptions`:

```typescript
interface MultipartOptions {
  limits?: {
    fieldNameSize?: number; // Max field name size (100 bytes)
    fieldSize?: number; // Max field value size (1MB)
    fields?: number; // Max text fields (Infinity)
    fileSize?: number; // Max file size (Infinity)
    files?: number; // Max files (Infinity)
    parts?: number; // Max parts (Infinity)
    headerPairs?: number; // Max headers (2000)
  };
}
```

**Example:**

```typescript
const avatar = await multipart.file("avatar", {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});
```

## Complete Example

```typescript
import { multipart, helpers } from "@minimajs/multipart";

export async function handleUpload() {
  const result: Record<string, unknown> = {};

  for await (const [name, value] of multipart.body()) {
    if (helpers.isFile(value)) {
      const savedName = await helpers.save(value, "./uploads");
      result[name] = {
        filename: value.name,
        savedAs: savedName,
        size: helpers.humanFileSize(value.size),
        type: value.type,
      };
    } else {
      result[name] = value;
    }
  }

  return { success: true, data: result };
}
```

## Next Steps

- [Schema Validation](./schema) - Type-safe uploads with Zod validation
