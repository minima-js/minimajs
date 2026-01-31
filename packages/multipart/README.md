# @minimajs/multipart

Efficient multipart form data handling for Minima.js with multiple consumption modes.

```bash
npm install @minimajs/multipart
```

## Overview

The package provides three ways to consume multipart data:

| Module      | Memory      | Use Case                          |
| ----------- | ----------- | --------------------------------- |
| `multipart` | Buffered    | Simple uploads, small files       |
| `streaming` | Lazy buffer | Large files with File API         |
| `raw`       | Unbuffered  | Advanced use cases, custom piping |
| `schema`    | Disk-backed | Validated uploads with Zod        |

## multipart (Buffered)

Standard approach that buffers files into memory as Web API `File` objects.

```ts
import { multipart, helpers } from "@minimajs/multipart";

// Get single file by field name
const avatar = await multipart.file("avatar");
await helpers.save(avatar, "./uploads");

// Get first file
const [fieldName, file] = await multipart.firstFile();

// Iterate all files
for await (const [field, file] of multipart.files()) {
  console.log(file.name, file.size);
}

// Get text fields only
const fields = await multipart.fields<{ name: string; email: string }>();

// Iterate all fields and files
for await (const [name, value] of multipart.body()) {
  if (helpers.isFile(value)) {
    await helpers.save(value, "./uploads");
  } else {
    console.log(name, value);
  }
}
```

## streaming (Lazy Buffer)

**Recommended for large files.** Returns `StreamFile` - a `File` subclass that doesn't load into memory until accessed.

```ts
import { streaming } from "@minimajs/multipart";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

const file = await streaming.file("video");

// Access metadata without loading file
console.log(file.name, file.type);

// Stream directly to disk (no memory buffering)
await pipeline(file.stream(), createWriteStream("./uploads/video.mp4"));

// Or buffer on demand
const text = await file.text();
const buffer = await file.arrayBuffer();
```

### StreamFile API

```ts
class StreamFile extends File {
  stream(): ReadableStream; // Get web stream (one-time)
  bytes(): Promise<Uint8Array>; // Buffer and return bytes
  text(): Promise<string>; // Buffer and decode as text
  arrayBuffer(): Promise<ArrayBuffer>;
  toReadable(): Readable | null; // Get Node.js stream
  toFile(): Promise<File>; // Convert to standard File
}
```

## raw (Advanced)

Low-level access to busboy streams for advanced use cases. For most large file handling, prefer `streaming` instead.

```ts
import { raw, helpers } from "@minimajs/multipart";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

// Get raw file stream
const file = await raw.file("video");
if (file) {
  await pipeline(file.stream, createWriteStream(`/uploads/${file.filename}`));
}

// Iterate raw files
for await (const file of raw.files()) {
  await helpers.save(file, "/uploads");
}

// Iterate all (fields + files)
for await (const item of raw.body()) {
  if (helpers.isRawFile(item)) {
    await helpers.drain(item); // or save
  } else {
    console.log(item.fieldname, item.value);
  }
}
```

### Raw Types

```ts
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
```

## helpers

Utility functions for file handling.

```ts
import { helpers } from "@minimajs/multipart";

// Save file to disk (works with File or raw stream)
const filename = await helpers.save(file, "/uploads");
const filename = await helpers.save(file, "/uploads", "custom-name.png");

// Type guards
helpers.isFile(value); // value is File
helpers.isRawFile(value); // value is MultipartRawFile
helpers.isRawField(value); // value is MultipartRawField

// Discard raw stream
await helpers.drain(rawFile);

// Generate random filename preserving extension
helpers.randomName("photo.jpg"); // "550e8400-e29b-41d4-a716-446655440000.jpg"

// Ensure directory exists
await helpers.ensurePath("/uploads", "images");

// Human readable file size
helpers.humanFileSize(1048576); // "1.0 MiB"
```

## schema (Zod Validation)

Type-safe multipart parsing with Zod schema validation. Files are saved to disk as `TempFile` (memory-efficient).

```ts
import { z } from "zod";
import { createMultipart } from "@minimajs/multipart/schema";
import { helpers } from "@minimajs/multipart";

const getBody = createMultipart({
  name: z.string().min(1).max(100),
  avatar: z
    .file()
    .mime(["image/jpeg", "image/png"])
    .max(5 * 1024 * 1024),
});

// In your handler
const data = await getBody();
console.log(data.name); // string (type-safe)
await helpers.save(data.avatar, "./uploads");
```

### Multiple Files

```ts
const getBody = createMultipart({
  title: z.string(),
  photos: z.array(z.file().max(10 * 1024 * 1024)).max(5), // Max 5 files, 10MB each
});

const data = await getBody();
for (const photo of data.photos) {
  await helpers.save(photo, "./uploads/photos");
}
```

### TempFile API

Files are stored on disk and implement the Web `File` interface:

```ts
class TempFile extends File {
  path: string; // Temp file path on disk
  stream(): ReadableStream; // Web stream
  bytes(): Promise<Uint8Array>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  toReadable(): Readable; // Node.js stream
  toFile(): Promise<File>; // Load into memory
  destroy(): Promise<boolean>; // Delete temp file
}
```

Files are automatically cleaned up after the request via `defer()`.

### Validation Methods

```ts
z.file(); // Any file
z.file().max(1024 * 1024); // Max 1MB
z.file().min(100); // Min 100 bytes
z.file().mime(["image/png"]); // Specific MIME types
z.file().mime(["image/*"]); // MIME wildcards
```

## Options

All functions accept `MultipartOptions` (busboy config):

```ts
await multipart.file("avatar", {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 5, // Max 5 files
    fields: 20, // Max 20 text fields
  },
});
```

Full documentation available at [minima-js.github.io/packages/multipart](https://minima-js.github.io/packages/multipart/).

## License

MIT
