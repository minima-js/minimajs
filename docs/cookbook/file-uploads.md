---
title: File Uploads
sidebar_position: 2
---

# Handling File Uploads

File uploads are a common requirement in modern web applications. Minima.js, with the `@minimajs/multipart` package, provides a powerful and flexible way to handle multipart form data, including file uploads.

This guide covers two main approaches:

- **Validation with Schema**: The recommended approach for most applications. It uses schema validation to ensure file types, sizes, and required fields are correct, providing a robust and secure way to handle uploads.
- **Basic Usage**: A lower-level API for simple use cases or when you need more control over the file stream.

## Prerequisites

Install the `@minimajs/multipart` package. For schema validation, you'll also need `yup`.

```bash
npm install @minimajs/multipart yup
```

## Validation with Schema

For production applications, it's highly recommended to use the `createMultipartUpload` function from `@minimajs/multipart/schema`. It provides a high-level API that integrates with `yup` for schema validation, temporary file management, and automatic cleanup.

**Key Benefits:**

- **Validation**: Define rules for file size, MIME types, and required fields.
- **Security**: Automatically uses temporary files and cleans them up.
- **Type-safe**: Infers the type of the uploaded data from your schema.

```typescript title="src/upload/routes.ts"
import { type App } from "@minimajs/server";
import { createMultipartUpload, file } from "@minimajs/multipart/schema";
import { string, array } from "yup";

const upload = createMultipartUpload(
  {
    name: string().required(),
    email: string().email().required(),
    avatar: file()
      .required()
      .max(5 * 1024 * 1024, "Avatar must be less than 5MB")
      .accept(["image/png", "image/jpeg"]),
    documents: array(
      file()
        .max(10 * 1024 * 1024)
        .accept(["application/pdf"])
    ).max(3),
  },
  {
    tmpDir: "./uploads/temp",
    maxSize: 50 * 1024 * 1024, // 50MB total request size
  }
);

export async function uploadRoutes(app: App) {
  app.post("/upload/profile", async () => {
    const data = await upload();

    // At this point, files are validated and stored in a temp directory.
    // The `data` object is fully typed.

    // Move the avatar to a permanent location
    const avatarPath = await data.avatar.move("./uploads/avatars");

    const documentPaths = [];
    if (data.documents) {
      for (const doc of data.documents) {
        documentPaths.push(await doc.move("./uploads/documents"));
      }
    }

    return {
      message: "Profile uploaded successfully",
      name: data.name,
      email: data.email,
      avatar: avatarPath,
      documents: documentPaths,
    };
  });
}
```

### Testing with curl

```bash
curl -X POST \
  -F "name=John Doe" \
  -F "email=john.doe@example.com" \
  -F "avatar=@/path/to/photo.jpg" \
  -F "documents=@/path/to/file1.pdf" \
  -F "documents=@/path/to/file2.pdf" \
  http://localhost:3000/upload/profile
```

## Basic Usage: Single File Upload

For simple scenarios, or when you need direct access to the file stream, you can use the lower-level `multipart` object.

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

## Complete Example

Here's a complete example combining the basic concepts:

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
