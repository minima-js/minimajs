---
title: Helpers
sidebar_position: 5
---

# Helper Functions

The `helpers` module provides utility functions for file handling, type guards, and stream operations.

```typescript
import { helpers } from "@minimajs/multipart";
```

## File Operations

### `save(file, dest?, filename?)`

Saves a file to disk. Works with `File`, `StreamFile`, `TempFile`, or `MultipartRawFile`.

**Parameters:**

- `file` - The file to save (File, StreamFile, TempFile, or MultipartRawFile)
- `dest` - Destination directory (defaults to `process.cwd()`)
- `filename` - Custom filename (auto-generates UUID-based name if omitted)

**Returns:** `Promise<string>` - The saved filename

```typescript
import { multipart, helpers } from "@minimajs/multipart";

const avatar = await multipart.file("avatar");

// Auto-generated UUID filename
const savedName = await helpers.save(avatar, "./uploads");
console.log(savedName); // "550e8400-e29b-41d4-a716-446655440000.jpg"

// Custom filename
await helpers.save(avatar, "./uploads", "profile.jpg");
```

Works with raw streams too:

```typescript
import { raw, helpers } from "@minimajs/multipart";

for await (const file of raw.files()) {
  await helpers.save(file, "./uploads");
}
```

### `randomName(filename)`

Generates a random UUID-based filename while preserving the original extension.

**Parameters:**

- `filename` - Original filename to extract extension from

**Returns:** `string` - UUID filename with original extension

```typescript
helpers.randomName("photo.jpg");
// "550e8400-e29b-41d4-a716-446655440000.jpg"

helpers.randomName("document.pdf");
// "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf"

helpers.randomName("archive.tar.gz");
// "f47ac10b-58cc-4372-a567-0e02b2c3d479.gz"
```

### `ensurePath(...paths)`

Ensures a directory path exists, creating it recursively if needed.

**Parameters:**

- `...paths` - Path segments to join and create

**Returns:** `Promise<string>` - The resolved absolute path

```typescript
// Create single directory
await helpers.ensurePath("./uploads");

// Create nested directories
await helpers.ensurePath("./uploads", "images", "avatars");
// Creates: ./uploads/images/avatars

// Use with save
const dir = await helpers.ensurePath("./uploads", "documents");
await helpers.save(file, dir);
```

### `drain(rawFile)`

Consumes and discards a raw multipart file stream. Use this to skip unwanted files without memory buildup.

**Parameters:**

- `rawFile` - The raw file to drain

**Returns:** `Promise<void>`

```typescript
import { raw, helpers } from "@minimajs/multipart";

for await (const file of raw.files()) {
  if (file.mimeType.startsWith("image/")) {
    await helpers.save(file, "./uploads");
  } else {
    // Skip non-image files
    await helpers.drain(file);
  }
}
```

## Type Guards

### `isFile(value)`

Checks if a value is a Web API `File` instance. Also returns true for `StreamFile` and `TempFile` since they extend `File`.

**Parameters:**

- `value` - Value to check

**Returns:** `value is File`

```typescript
import { multipart, helpers } from "@minimajs/multipart";

for await (const [name, value] of multipart.body()) {
  if (helpers.isFile(value)) {
    // value is File
    console.log(value.name, value.size, value.type);
    await helpers.save(value, "./uploads");
  } else {
    // value is string
    console.log(name, value);
  }
}
```

### `isRawFile(value)`

Checks if a value is a raw multipart file from the parser (has unbuffered stream).

**Parameters:**

- `value` - Value to check

**Returns:** `value is MultipartRawFile`

```typescript
import { raw, helpers } from "@minimajs/multipart";

for await (const item of raw.body()) {
  if (helpers.isRawFile(item)) {
    // item is MultipartRawFile
    console.log(item.fieldname, item.filename, item.mimeType);
    await helpers.save(item, "./uploads");
  } else {
    // item is MultipartRawField
    console.log(item.fieldname, item.value);
  }
}
```

### `isRawField(value)`

Checks if a value is a raw multipart text field from the parser.

**Parameters:**

- `value` - Value to check

**Returns:** `value is MultipartRawField`

```typescript
import { raw, helpers } from "@minimajs/multipart";

for await (const item of raw.body()) {
  if (helpers.isRawField(item)) {
    // item is MultipartRawField
    console.log(item.fieldname, item.value);
  }
}
```

## Stream Utilities

### `stream2uint8array(stream, options?)`

Reads a Node.js Readable stream into a `Uint8Array` with optional size limit.

**Parameters:**

- `stream` - Node.js Readable stream
- `options.fileSize` - Maximum allowed size in bytes (default: Infinity)

**Returns:** `Promise<Uint8Array>`

**Throws:** `Error` if stream exceeds `fileSize` limit

```typescript
import { Readable } from "node:stream";
import { helpers } from "@minimajs/multipart";

const stream = Readable.from(["Hello", " ", "World"]);
const bytes = await helpers.stream2uint8array(stream);
console.log(new TextDecoder().decode(bytes)); // "Hello World"

// With size limit
const limited = await helpers.stream2uint8array(stream, {
  fileSize: 1024 * 1024, // 1MB max
});
```

### `stream2buffer(stream)`

Reads a Node.js Readable stream into a Buffer.

**Parameters:**

- `stream` - Node.js Readable stream

**Returns:** `Promise<Buffer>`

```typescript
import { Readable } from "node:stream";
import { helpers } from "@minimajs/multipart";

const stream = Readable.from([Buffer.from("Hello")]);
const buffer = await helpers.stream2buffer(stream);
console.log(buffer.toString()); // "Hello"
```

### `stream2void()`

Creates a Writable stream that discards all data. Useful for consuming streams you don't need.

**Returns:** `Writable`

```typescript
import { pipeline } from "node:stream/promises";
import { helpers } from "@minimajs/multipart";

// Discard stream contents
await pipeline(someStream, helpers.stream2void());
```

## Conversion Utilities

### `raw2file(raw, options)`

Converts a raw multipart file stream into a Web API `File` by buffering the entire stream into memory.

**Parameters:**

- `raw` - Raw multipart file
- `options.fileSize` - Maximum file size in bytes

**Returns:** `Promise<File>`

```typescript
import { raw, helpers } from "@minimajs/multipart";

const rawFile = await raw.file("avatar");
const file = await helpers.raw2file(rawFile, { fileSize: 5 * 1024 * 1024 });
console.log(file.name, file.size, file.type);
```

### `raw2streamFile(raw)`

Wraps a raw multipart file stream into a `StreamFile` without buffering. The stream is consumed lazily on first read.

**Parameters:**

- `raw` - Raw multipart file

**Returns:** `StreamFile`

```typescript
import { raw, helpers } from "@minimajs/multipart";

const rawFile = await raw.file("video");
const streamFile = helpers.raw2streamFile(rawFile);

// Not buffered yet
console.log(streamFile.name, streamFile.type);

// Buffers on first read
const content = await streamFile.text();
```
