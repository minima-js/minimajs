---
title: File Uploads
sidebar_position: 2
---

# Handling File Uploads

File uploads are a common requirement in modern web applications. Minima.js provides a simple and efficient way to handle file uploads using the `@minimajs/multipart` package, which is context-aware and returns native Web API `File` objects.

## Prerequisites

```bash
npm install @minimajs/multipart
```

## Quick Start

::: code-group

```typescript [src/uploads/module.ts]
import { abort, type Routes } from "@minimajs/server";
import { multipart, helpers } from "@minimajs/multipart";

async function uploadAvatar() {
  const file = await multipart.file("avatar");

  if (!file) {
    abort({ error: "No file uploaded" }, 400);
  }

  await helpers.save(file, "./uploads");
  return { message: "Uploaded", filename: file.name };
}

export const routes: Routes = {
  "POST /upload": uploadAvatar,
};
```

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/bun";

const app = createApp();
await app.listen({ port: 3000 });
```

:::

## Single File Upload

Use `multipart.file(fieldName)` to get a single file by field name. Returns a native `File` object.

::: code-group

```typescript [src/uploads/module.ts]
import { abort, type Routes } from "@minimajs/server";
import { multipart, helpers } from "@minimajs/multipart";

async function uploadAvatar() {
  const avatar = await multipart.file("avatar");

  if (!avatar) {
    abort({ error: "No avatar uploaded" }, 400);
  }

  // Save with auto-generated UUID filename
  const savedName = await helpers.save(avatar, "./uploads/avatars");

  return {
    message: "Avatar uploaded",
    originalName: avatar.name,
    savedAs: savedName,
    size: helpers.humanFileSize(avatar.size),
    type: avatar.type,
  };
}

export const routes: Routes = {
  "POST /avatar": uploadAvatar,
};
```

:::

Test with curl:

```bash
curl -X POST -F "avatar=@photo.jpg" http://localhost:3000/uploads/avatar
```

## Multiple File Uploads

Use `multipart.files()` to iterate over all uploaded files.

::: code-group

```typescript [src/gallery/module.ts]
import { type Routes } from "@minimajs/server";
import { multipart, helpers } from "@minimajs/multipart";

async function uploadGallery() {
  const uploaded = [];

  for await (const [field, file] of multipart.files()) {
    const savedName = await helpers.save(file, "./uploads/gallery");
    uploaded.push({
      field,
      originalName: file.name,
      savedAs: savedName,
      size: file.size,
    });
  }

  return { message: "Gallery uploaded", files: uploaded };
}

export const routes: Routes = {
  "POST /gallery": uploadGallery,
};
```

:::

Test with curl:

```bash
curl -X POST \
  -F "photo1=@image1.jpg" \
  -F "photo2=@image2.jpg" \
  -F "photo3=@image3.jpg" \
  http://localhost:3000/gallery
```

## Mixed Fields and Files

Use `multipart.body()` to process both text fields and files together.

::: code-group

```typescript [src/profile/module.ts]
import { type Routes } from "@minimajs/server";
import { multipart, helpers } from "@minimajs/multipart";

async function updateProfile() {
  const data: Record<string, unknown> = {};

  for await (const [name, value] of multipart.body()) {
    if (helpers.isFile(value)) {
      const savedName = await helpers.save(value, "./uploads");
      data[name] = { filename: value.name, savedAs: savedName };
    } else {
      data[name] = value;
    }
  }

  return { message: "Profile updated", data };
}

export const routes: Routes = {
  "POST /update": updateProfile,
};
```

:::

Test with curl:

```bash
curl -X POST \
  -F "username=john" \
  -F "email=john@example.com" \
  -F "avatar=@photo.jpg" \
  http://localhost:3000/profile/update
```

## Large File Uploads (Streaming)

For large files, use the `streaming` module to avoid memory buffering:

::: code-group

```typescript [src/videos/module.ts]
import { abort, type Routes } from "@minimajs/server";
import { streaming } from "@minimajs/multipart";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

async function uploadVideo() {
  const file = await streaming.file("video");

  if (!file) {
    abort({ error: "No video uploaded" }, 400);
  }

  // Stream directly to disk without buffering
  await pipeline(file.stream(), createWriteStream(`./uploads/${file.name}`));

  return { message: "Video uploaded", filename: file.name };
}

export const routes: Routes = {
  "POST /upload": uploadVideo,
};
```

:::

## Validated Uploads with Zod

Use the schema module for type-safe validation:

::: code-group

```typescript [src/posts/module.ts]
import { type Routes } from "@minimajs/server";
import { z } from "zod";
import { createMultipart } from "@minimajs/multipart/schema";
import { helpers } from "@minimajs/multipart";

const upload = createMultipart({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  image:
    z
      .file()
      .mime(["image/jpeg", "image/png", "image/webp"])
      .max(5 * 1024 * 1024), // 5MB
});

async function createPost() {
  const data = await upload();

  const savedName = await helpers.save(data.image, "./uploads/posts");

  return {
    title: data.title,
    description: data.description,
    imageUrl: `/uploads/posts/${savedName}`,
  };
}

export const routes: Routes = {
  "POST /create": createPost,
};
```

:::

## File Size Limits

Set limits using the options parameter:

```typescript
const file = await multipart.file("document", {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5, // Max 5 files
  },
});
```

## Return File Directly

Files can be returned directly from handlers with automatic `Content-Type`:

::: code-group

```typescript [src/preview/module.ts]
import { type Routes } from "@minimajs/server";
import { z } from "zod";
import { createMultipart } from "@minimajs/multipart/schema";

const upload = createMultipart({
  image: z.file().mime(["image/jpeg", "image/png"]),
});

async function previewImage() {
  const data = await upload();
  return data.image; // Returns with correct Content-Type
}

export const routes: Routes = {
  "POST /image": previewImage,
};
```

:::

## Helper Functions

```typescript
import { helpers } from "@minimajs/multipart";

// Save file to disk
await helpers.save(file, "./uploads");
await helpers.save(file, "./uploads", "custom-name.jpg");

// Type guards
helpers.isFile(value); // Check if value is a File
helpers.isRawFile(value); // Check if value is raw stream

// Generate unique filename
helpers.randomName("photo.jpg"); // "uuid-here.jpg"

// Create directory if needed
await helpers.ensurePath("./uploads", "images");

// Human readable size
helpers.humanFileSize(1048576); // "1.0 MiB"
```

## Next Steps

- [Multipart API Reference](/packages/multipart/) - Full API documentation
- [Schema Validation](/packages/multipart/schema) - Type-safe uploads with Zod
- [Helper Functions](/packages/multipart/helpers) - All utility functions