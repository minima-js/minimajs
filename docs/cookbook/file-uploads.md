--- 
title: File Uploads
sidebar_position: 2
---

# Handling File Uploads

File uploads are a common requirement in modern web applications. Minima.js provides a simple and efficient way to handle file uploads using the `@minimajs/multipart` package.

This recipe will show you how to handle single and multiple file uploads, access file information, and save the uploaded files to disk.

## Prerequisites

First, you need to install the `@minimajs/multipart` package:

```bash
npm install @minimajs/multipart
```

## 1. Handling a Single File Upload

To handle a single file upload, you can use the `file()` helper from `@minimajs/multipart`.

```typescript
import { createApp } from '@minimajs/server';
import { multipart } from '@minimajs/multipart';
import * as fs from 'fs';
import * as util from 'util';

const pump = util.promisify(require('stream').pipeline);

const app = createApp();

app.post('/upload/single', async (request, reply) => {
  const data = await multipart.file(request.raw);

  // data.file is a stream of the uploaded file
  // data.filename is the name of the file
  // data.mimetype is the MIME type of the file

  await pump(data.file, fs.createWriteStream(`./uploads/${data.filename}`));

  reply.send({ message: 'File uploaded successfully' });
});

await app.listen({ port: 3000 });
```

In this example:
*   We use `multipart.file()` to get the uploaded file from the request.
*   The `multipart.file()` function returns an object containing the file stream, filename, and mimetype.
*   We then use `stream.pipeline` to save the file to the `uploads` directory.

You can test this route using `curl`:

```bash
curl -X POST -F "file=@/path/to/your/file.txt" http://localhost:3000/upload/single
```

## 2. Handling Multiple File Uploads

To handle multiple file uploads, you can use the `multipart.files()` helper. This helper returns an async iterator that you can use to iterate over the uploaded files.

```typescript
import { createApp } from '@minimajs/server';
import { multipart } from '@minimajs/multipart';
import * as fs from 'fs';
import * as util from 'util';

const pump = util.promisify(require('stream').pipeline);

const app = createApp();

app.post('/upload/multiple', async (request, reply) => {
  const parts = multipart.files(request.raw);

  for await (const part of parts) {
    await pump(part.file, fs.createWriteStream(`./uploads/${part.filename}`));
  }

  reply.send({ message: 'Files uploaded successfully' });
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

## 3. Accessing Other Form Fields

You can also access other form fields that are sent along with the file uploads. The `part` object in the async iterator contains a `fields` property, which is a map of the other form fields.

```typescript
app.post('/upload/with-fields', async (request, reply) => {
  const parts = multipart.files(request.raw);

  for await (const part of parts) {
    console.log('Fieldname:', part.fieldname);
    console.log('Filename:', part.filename);
    console.log('Mimetype:', part.mimetype);
    console.log('Fields:', part.fields); // Access other form fields

    await pump(part.file, fs.createWriteStream(`./uploads/${part.filename}`));
  }

  reply.send({ message: 'Files uploaded successfully' });
});
```

This makes it easy to handle complex forms with both file uploads and other data.
