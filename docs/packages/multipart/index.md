---
title: Multipart
sidebar_position: 3
---

# Multipart File Uploads

The `@minimajs/multipart` package provides a simple, context-aware API for handling multipart form data with native `File` instances and streaming support.

## Installation

```bash npm2yarn
npm install @minimajs/multipart
```

## Key Features

- ✅ **Native File API** - Returns standard `File` instances (Web Standards)
- ✅ **Memory Efficient** - Stream files directly without buffering
- ✅ **Zero Configuration** - Works out of the box
- ✅ **Context-Aware** - Integrates seamlessly with Minima.js
- ✅ **TypeScript First** - Full type safety and inference

## Quick Start

### Single File Upload

The simplest way to handle file uploads. Returns a native `File` instance.

```typescript
import { multipart, helpers } from "@minimajs/multipart";

export async function uploadAvatar() {
  // Get file from specific field - returns native File
  const avatar = await multipart.file("avatar");

  if (!avatar) {
    return { error: "No file uploaded" };
  }

  // Move file to destination
  await helpers.move(avatar, "./uploads/avatars");

  // File is a valid Response - renders with correct content-type
  return avatar;
}
```

### Streaming Large Files

For large files, use `rawFile()` to stream directly to disk without loading into memory.

```typescript
import { multipart, helpers } from "@minimajs/multipart";

export async function uploadVideo() {
  // Get raw file stream - no memory buffering
  const video = await multipart.rawFile("video");

  if (!video) {
    return { error: "No video uploaded" };
  }

  // Stream directly to destination
  await helpers.move(video, "./uploads/videos");

  return { filename: video.filename, size: "streamed" };
}
```

## API Reference

### `multipart.file(name, options?)`

Retrieves a single file from the multipart request and loads it into memory as a native `File` instance.

**Parameters:**
- `name` (string) - Field name to match
- `options` (MultipartOptions) - Optional configuration

**Returns:** `Promise<File | null>`

**Example:**

```typescript
const avatar = await multipart.file("avatar");
if (avatar) {
  console.log(avatar.name);      // filename
  console.log(avatar.type);      // MIME type
  console.log(avatar.size);      // file size
  await helpers.move(avatar, "./uploads");
}
```

### `multipart.rawFile(name, options?)`

Retrieves a single file as a raw stream without buffering into memory. Perfect for large files.

**Parameters:**
- `name` (string) - Field name to match
- `options` (MultipartOptions) - Optional configuration

**Returns:** `Promise<MultipartRawFile | null>`

**MultipartRawFile properties:**
- `fieldname` - The form field name
- `filename` - Original filename
- `stream` - Node.js Readable stream
- `mimeType` - MIME type
- `transferEncoding` - Transfer encoding

**Example:**

```typescript
const video = await multipart.rawFile("video");
if (video) {
  console.log(video.filename);
  console.log(video.mimeType);
  await helpers.move(video, "./uploads");
}
```

### `multipart.firstFile(options?)`

Retrieves the first file from the request, regardless of field name.

**Returns:** `Promise<[fieldName: string, file: File] | null>`

**Example:**

```typescript
const result = await multipart.firstFile();
if (result) {
  const [fieldName, file] = result;
  console.log(`Received ${file.name} from field ${fieldName}`);
  await helpers.move(file, "./uploads");
}
```

### `multipart.files(options?)`

Returns an async iterable that yields all files from the request.

**Returns:** `AsyncGenerator<[fieldName: string, file: File]>`

**Example:**

```typescript
for await (const [fieldName, file] of multipart.files()) {
  console.log(`Processing ${file.name} from ${fieldName}`);
  await helpers.move(file, `./uploads/${fieldName}`);
}
```

### `multipart.fields()`

Retrieves all text fields from the multipart request (files are ignored).

**Returns:** `Promise<Record<string, string | string[]>>`

**Example:**

```typescript
const fields = await multipart.fields<{ name: string; email: string }>();
console.log(fields.name);
console.log(fields.email);
```

### `multipart.body(options?)`

Returns an async iterable that yields both text fields and files.

**Returns:** `AsyncGenerator<[fieldName: string, value: string | File]>`

**Example:**

```typescript
import { isFile } from "@minimajs/multipart";

for await (const [name, value] of multipart.body()) {
  if (isFile(value)) {
    console.log(`File: ${name} = ${value.name}`);
    await helpers.move(value, "./uploads");
  } else {
    console.log(`Field: ${name} = ${value}`);
  }
}
```

### `multipart.raw(options?)`

Low-level API that returns raw multipart results without processing files into memory.

**Returns:** `AsyncGenerator<MultipartRawResult>`

**Example:**

```typescript
import { isRawFile } from "@minimajs/multipart";

for await (const body of multipart.raw()) {
  if (isRawFile(body)) {
    console.log(`File: ${body.fieldname} = ${body.filename}`);
    await helpers.move(body, "./dest");
  } else {
    console.log(`Field: ${body.fieldname} = ${body.value}`);
  }
}
```

## Helper Functions

### `helpers.move(file, destination, filename?)`

Moves an uploaded file to a destination directory.

**Parameters:**
- `file` - File, TempFile, or MultipartRawFile
- `destination` - Destination directory path
- `filename` - Optional custom filename (auto-generates UUID-based name if omitted)

**Returns:** `Promise<string>` - The saved filename

**Example:**

```typescript
import { helpers } from "@minimajs/multipart";

const avatar = await multipart.file("avatar");
const savedName = await helpers.move(avatar, "./uploads/avatars");
console.log(`Saved as: ${savedName}`); // e.g., "a1b2c3d4-e5f6.jpg"

// With custom filename
await helpers.move(avatar, "./uploads", "profile.jpg");
```

### `helpers.randomName(filename)`

Generates a random UUID-based filename while preserving the extension.

**Example:**

```typescript
import { helpers } from "@minimajs/multipart";

const newName = helpers.randomName("avatar.jpg");
console.log(newName); // e.g., "a1b2c3d4-e5f6-7890-1234-567890abcdef.jpg"
```

### `helpers.ensurePath(...paths)`

Ensures a directory exists, creating it recursively if needed.

**Example:**

```typescript
import { helpers } from "@minimajs/multipart";

const dir = await helpers.ensurePath("./uploads", "avatars");
// Creates ./uploads/avatars if it doesn't exist
```

### `helpers.humanFileSize(bytes, decimals?)`

Converts bytes to human-readable file size.

**Example:**

```typescript
import { helpers } from "@minimajs/multipart";

console.log(helpers.humanFileSize(1024));      // "1.0 KiB"
console.log(helpers.humanFileSize(5242880));   // "5.0 MiB"
```

## Type Guards

### `isFile(value)`

Checks if a value is a `File` instance.

```typescript
import { isFile } from "@minimajs/multipart";

if (isFile(value)) {
  console.log(value.name);
}
```

### `isRawFile(value)`

Checks if a value is a `MultipartRawFile` instance.

```typescript
import { isRawFile } from "@minimajs/multipart";

if (isRawFile(value)) {
  console.log(value.filename);
}
```

## Configuration Options

### MultipartOptions

```typescript
interface MultipartOptions {
  limits?: {
    fieldNameSize?: number;  // Max field name size (default: 100 bytes)
    fieldSize?: number;      // Max field value size (default: 1MB)
    fields?: number;         // Max number of non-file fields (default: Infinity)
    fileSize?: number;       // Max file size (default: Infinity)
    files?: number;          // Max number of files (default: Infinity)
    parts?: number;          // Max number of parts (default: Infinity)
    headerPairs?: number;    // Max number of header pairs (default: 2000)
  };
}
```

**Example:**

```typescript
const avatar = await multipart.file("avatar", {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1,                   // Only 1 file allowed
  }
});
```

## Complete Example

```typescript
import { multipart, helpers, isFile } from "@minimajs/multipart";

export async function handleUpload() {
  const data: Record<string, any> = {};

  // Process all fields and files
  for await (const [name, value] of multipart.body()) {
    if (isFile(value)) {
      // Save file and store filename
      const savedName = await helpers.move(value, "./uploads");
      data[name] = {
        filename: value.name,
        savedAs: savedName,
        size: value.size,
        type: value.type,
      };
    } else {
      // Store text field
      data[name] = value;
    }
  }

  return { success: true, data };
}
```

## Next Steps

- [Schema Validation](./schema) - Type-safe uploads with Zod validation
