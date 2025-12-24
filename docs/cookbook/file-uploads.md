---
title: File Uploads
sidebar_position: 2
---

# Handling File Uploads

File uploads are a common requirement in modern web applications. Minima.js provides a simple and efficient way to handle file uploads using the `@minimajs/multipart` package.

This cookbook shows you how to handle single and multiple file uploads, access file information, and save uploaded files to disk.

## Prerequisites

Install the `@minimajs/multipart` package:

```bash
npm install @minimajs/multipart
```

## Single File Upload

Use `multipart.file()` to handle a single file upload. You can optionally specify a field name to retrieve a specific file.

```typescript title="src/upload/routes.ts"
import { type App } from "@minimajs/server";
import { multipart } from "@minimajs/multipart";

export async function uploadRoutes(app: App) {
  app.post("/upload/single", async () => {
    const file = await multipart.file();

    // Save file to uploads directory with a random name
    const filename = await file.move("./uploads");

    return {
      message: "File uploaded successfully",
      filename,
      originalName: file.filename,
      mimeType: file.mimeType,
    };
  });

  // Upload from specific field
  app.post("/upload/avatar", async () => {
    const avatar = await multipart.file("avatar");

    // Save with custom filename
    await avatar.move("./uploads", "avatar.png");

    return {
      message: "Avatar uploaded successfully",
      size: (await avatar.buffer()).length,
    };
  });
}
```

**Key Points:**
- `multipart.file()` - Gets the first file from any field
- `multipart.file("fieldName")` - Gets a file from a specific field
- `file.move(dir, filename)` - Saves the file to disk
- `file.randomName` - Generated UUID-based filename with original extension

### Testing with curl

```bash
# Upload to any field
curl -X POST -F "file=@/path/to/document.pdf" http://localhost:3000/upload/single

# Upload to specific field
curl -X POST -F "avatar=@/path/to/photo.jpg" http://localhost:3000/upload/avatar
```

## Multiple File Uploads

Use `multipart.files()` to handle multiple file uploads. It returns an async iterator that yields each uploaded file.

```typescript title="src/upload/routes.ts"
import { type App } from "@minimajs/server";
import { multipart } from "@minimajs/multipart";

export async function uploadRoutes(app: App) {
  app.post("/upload/multiple", async () => {
    const uploadedFiles = [];

    for await (const file of multipart.files()) {
      const filename = await file.move("./uploads");

      uploadedFiles.push({
        filename,
        originalName: file.filename,
        mimeType: file.mimeType,
        field: file.field,
      });
    }

    return {
      message: "Files uploaded successfully",
      files: uploadedFiles,
    };
  });
}
```

### Testing with curl

```bash
curl -X POST \
  -F "documents=@/path/to/file1.pdf" \
  -F "documents=@/path/to/file2.pdf" \
  -F "image=@/path/to/photo.jpg" \
  http://localhost:3000/upload/multiple
```

## Handling Form Fields with Files

Use `multipart.body()` to handle both files and text fields in a single request. It yields tuples of `[fieldName, value]` where value can be a string or File.

```typescript title="src/upload/routes.ts"
import { type App } from "@minimajs/server";
import { multipart, isFile } from "@minimajs/multipart";

export async function uploadRoutes(app: App) {
  app.post("/upload/with-metadata", async () => {
    const files = [];
    const fields: Record<string, string> = {};

    for await (const [name, value] of multipart.body()) {
      if (isFile(value)) {
        // Handle file upload
        const filename = await value.move("./uploads");
        files.push({
          field: name,
          filename,
          originalName: value.filename,
          mimeType: value.mimeType,
        });
      } else {
        // Handle text field
        fields[name] = value;
      }
    }

    return {
      message: "Upload complete",
      files,
      metadata: fields,
    };
  });
}
```

### Testing with curl

```bash
curl -X POST \
  -F "title=My Document" \
  -F "description=Important file" \
  -F "document=@/path/to/file.pdf" \
  http://localhost:3000/upload/with-metadata
```

## Text Fields Only

Use `multipart.fields()` when you only need text field data and want to ignore any files.

```typescript title="src/upload/routes.ts"
import { type App } from "@minimajs/server";
import { multipart } from "@minimajs/multipart";

export async function uploadRoutes(app: App) {
  app.post("/submit-form", async () => {
    const fields = await multipart.fields<{
      name: string;
      email: string;
      message: string;
    }>();

    // Process form data
    console.log(`Name: ${fields.name}`);
    console.log(`Email: ${fields.email}`);

    return {
      message: "Form submitted successfully",
      data: fields,
    };
  });
}
```

## Working with File Buffers

If you need to process file contents in memory instead of saving to disk, use `file.buffer()`:

```typescript title="src/upload/routes.ts"
import { type App } from "@minimajs/server";
import { multipart } from "@minimajs/multipart";
import { createHash } from "node:crypto";

export async function uploadRoutes(app: App) {
  app.post("/upload/checksum", async () => {
    const file = await multipart.file();

    // Read file as buffer
    const buffer = await file.buffer();

    // Calculate checksum
    const hash = createHash("sha256");
    hash.update(buffer);
    const checksum = hash.digest("hex");

    return {
      filename: file.filename,
      size: buffer.length,
      checksum,
    };
  });
}
```

## File Properties

Each `File` instance provides the following properties:

```typescript
interface File {
  field: string;        // Form field name
  filename: string;     // Original filename
  encoding: string;     // File encoding (e.g., '7bit')
  mimeType: string;     // MIME type (e.g., 'image/png')
  ext: string;          // File extension (e.g., '.png')
  randomName: string;   // UUID-based random filename
  stream: Readable;     // File content stream

  // Methods
  buffer(): Promise<Buffer>;                          // Read as buffer
  move(dir?: string, filename?: string): Promise<string>;  // Save to disk
  flush(): Promise<void>;                             // Discard file
}
```

## Complete Example

Here's a complete example combining all the concepts:

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";
import { multipart, isFile } from "@minimajs/multipart";
import { mkdir } from "node:fs/promises";

const app = createApp();

// Ensure uploads directory exists
await mkdir("./uploads", { recursive: true });

// Single file upload
app.post("/upload", async () => {
  const file = await multipart.file();
  const filename = await file.move("./uploads");

  return {
    success: true,
    filename,
    originalName: file.filename,
  };
});

// Multiple files with metadata
app.post("/upload/batch", async () => {
  const uploads = [];
  let title = "";

  for await (const [name, value] of multipart.body()) {
    if (isFile(value)) {
      const filename = await value.move("./uploads");
      uploads.push({
        field: name,
        filename,
        originalName: value.filename,
      });
    } else if (name === "title") {
      title = value;
    }
  }

  return {
    success: true,
    title,
    files: uploads,
  };
});

await app.listen({ port: 3000 });
```

## Best Practices

1. **Validate File Types**: Always validate MIME types before processing
2. **Size Limits**: Use Busboy's built-in limits for file size restrictions
3. **Security**: Never trust user-provided filenames - use random names
4. **Storage**: Consider using cloud storage (S3, GCS) for production
5. **Error Handling**: Always handle upload errors gracefully
6. **Cleanup**: Use `file.flush()` to discard unwanted files

## Advanced: Custom Storage

For custom file processing or cloud storage:

```typescript
import { multipart } from "@minimajs/multipart";
import { pipeline } from "node:stream/promises";

app.post("/upload/custom", async () => {
  const file = await multipart.file();

  // Stream directly to custom destination
  await pipeline(
    file.stream,
    yourCustomWriteStream // e.g., S3 upload stream
  );

  return { success: true };
});
```

## Next Steps

- Add file type validation using MIME types
- Implement file size limits
- Add image processing (resizing, optimization)
- Integrate with cloud storage providers
- Implement progress tracking for large uploads
