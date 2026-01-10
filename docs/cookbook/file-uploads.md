---
title: File Uploads
sidebar_position: 2
---

# Handling File Uploads

File uploads are a common requirement in modern web applications. Minima.js provides a simple and efficient way to handle file uploads using the `@minimajs/multipart` package, which is context-aware and easy to use.

## Prerequisites

First, you need to install the `@minimajs/multipart` package:

```bash
npm install @minimajs/multipart
```

## 1. Handling a Single File Upload

To handle a single file upload, use the `multipart.file()` helper. It's context-aware, so you don't need to pass any request objects. It returns a `Promise` that resolves to a `File` object.

```typescript
import { createApp } from "@minimajs/server";
import { multipart } from "@minimajs/multipart";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const app = createApp();

app.post("/upload/single", async () => {
  // If multiple files are uploaded on different fields, you can specify the field name.
  // const file = await multipart.file("my-specific-field");
  
  const file = await multipart.file(); // Gets the first file from the request

  if (!file) {
    return { message: "No file uploaded" };
  }

  // file is a File object with properties like `filename`, `mimetype`, and `stream`.
  await pipeline(file.stream, createWriteStream(`./uploads/${file.filename}`));

  return { message: "File uploaded successfully" };
});

await app.listen({ port: 3000 });
```

In this example:
- We use `multipart.file()` to get the uploaded file from the request.
- The `multipart.file()` function returns a `Promise<File>`.
- We then use `stream/promises`'s `pipeline` to save the file stream to the `uploads` directory.

You can test this route using `curl`:
```bash
curl -X POST -F "file=@/path/to/your/file.txt" http://localhost:3000/upload/single
```

## 2. Handling Multiple File Uploads

To handle multiple file uploads, use the `multipart.files()` helper. This helper returns an async iterator that yields each uploaded `File` object.

```typescript
import { createApp } from "@minimajs/server";
import { multipart } from "@minimajs/multipart";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const app = createApp();

app.post("/upload/multiple", async () => {
  for await (const file of multipart.files()) {
    await pipeline(file.stream, createWriteStream(`./uploads/${file.filename}`));
  }

  return { message: "Files uploaded successfully" };
});

await app.listen({ port: 3000 });
```

You can test this route using `curl`:
```bash
curl -X POST \
  -F "file1=@/path/to/your/file1.txt" \
  -F "file2=@/path/to/your/file2.txt" \
  http://localhost:3000/upload/multiple
```

## 3. Accessing All Form Parts (Fields and Files)

To access all parts of a multipart form, including both text fields and files, use the `multipart()` helper. It returns an async iterator that yields a tuple `[fieldName, value]` for each part, where `value` can be a `string` or a `File` object.

```typescript
import { createApp } from "@minimajs/server";
import { multipart, isFile } from "@minimajs/multipart";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const app = createApp();

app.post("/upload/with-fields", async () => {
  const fields: Record<string, string> = {};

  for await (const [name, value] of multipart()) {
    if (isFile(value)) {
      // It's a file
      console.log(`Processing file: ${value.filename}`);
      await pipeline(value.stream, createWriteStream(`./uploads/${value.filename}`));
    } else {
      // It's a text field
      console.log(`Field ${name}: ${value}`);
      fields[name] = value;
    }
  }

  return { message: "Form processed successfully", fields };
});
```
This is the most flexible way to process complex forms with mixed data types.