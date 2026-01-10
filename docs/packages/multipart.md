---
title: Multipart
sidebar_position: 3
---

## Efficient Multipart Data Handling in Minima.js

The `@minimajs/multipart` package provides a simple, context-aware API for handling multipart form data, including file uploads.

**Installation:**

```bash npm2yarn
npm install @minimajs/multipart
```

### Targeted File Access: `multipart.file()`

Retrieves a single file from the request. If a field name is provided, it gets that specific file; otherwise, it resolves with the first file found.

```typescript
import { multipart } from "@minimajs/multipart";

async function handleFile() {
  // Get the first file in the request
  const anyFile = await multipart.file();

  // Get a file from a specific field
  const avatar = await multipart.file("avatar");

  if (avatar) {
    const fileBuffer = await avatar.buffer();
    // Process the file buffer...
  }
}
```

### Iterate Over Multiple Files: `multipart.files()`

Provides an asynchronous iterator that yields each uploaded `File` object sequentially, ignoring non-file fields.

```typescript
import { multipart } from "@minimajs/multipart";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

async function handleMultipleFiles() {
  for await (const file of multipart.files()) {
    console.log(`Saving file: ${file.filename}`);
    await pipeline(file.stream, createWriteStream(file.filename));
  }
}
```

### Retrieve Form Fields: `multipart.fields()`

Returns a promise that resolves to a `Record<string, unknown>`, providing access to all non-file form fields and their corresponding values.

```typescript
import { multipart } from "@minimajs/multipart";

async function handleFormFields() {
  const formData = await multipart.fields();
  const username = formData.username as string;
  const email = formData.email as string;
  // Process form data...
}
```

### Process All Parts: `multipart()`

Returns an asynchronous iterator that yields a tuple `[fieldName, value]` for every part in the request body. The `value` can be a `string` for text fields or a `File` object for file uploads. This offers maximum flexibility.

```typescript
import { multipart, isFile } from "@minimajs/multipart";

async function handleRequestBody() {
  for await (const [fieldName, value] of multipart()) {
    if (isFile(value)) {
      console.log(`File uploaded in field ${fieldName}: ${value.filename}`);
      // Handle file upload...
    } else {
      console.log(`Field: ${fieldName}, Value: ${value}`);
    }
  }
}
```

## The `File` Class

This class encapsulates the information and functionality related to an uploaded file.

- **Properties:**
  - `field`: The name of the form field for the file.
  - `filename`: The original filename.
  - `encoding`: The character encoding of the file.
  - `mimeType`: The MIME type of the file.
  - `stream`: A `Readable` stream of the file content.

- **Methods:**
  - `buffer()`: Reads the entire file content into a buffer.
  - `move(dir, filename)`: Moves the uploaded file to a specified directory.
  - `flush()`: Discards the remaining content of the stream.

## The `isFile` Function

A type guard function to check if a given object is an instance of the `File` class.

```typescript
import { isFile } from "@minimajs/multipart";

if (isFile(someValue)) {
  // someValue is now typed as File
  console.log(someValue.filename);
}
```