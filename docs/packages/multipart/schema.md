---
title: Schema Validation
sidebar_position: 4
---

# Multipart Schema Validation

Type-safe multipart form data parsing with Zod schema validation. Files are automatically saved to disk as `TempFile` instances (memory-efficient), while text fields are validated according to your schema.

## Installation

```bash
npm install @minimajs/multipart zod
```

## Why Use Schema Validation?

- ✅ **Full TypeScript inference** - Types flow automatically from your schema
- ✅ **Automatic validation** - File size, MIME type, and field validation
- ✅ **Memory efficient** - Files saved to disk, not held in memory
- ✅ **Native File API** - Compatible with Web `File` interface
- ✅ **Direct response** - Return files directly with correct content-type
- ✅ **Better errors** - Clear validation error messages

### Return Files Directly

`TempFile` extends the native `File` API, so you can return it directly from handlers:

```typescript
const upload = createMultipart({
  avatar: z.file().mime(["image/jpeg", "image/png"]),
});

export async function getAvatar() {
  const data = await upload();
  return data.avatar; // Returns file with correct Content-Type header
}
```

## Quick Start

### Basic File Upload with Validation

```typescript
import { z } from "zod";
import { createMultipart } from "@minimajs/multipart/schema";
import { helpers } from "@minimajs/multipart";

const upload = createMultipart({
  name: z.string().min(3).max(30),
  email: z.string().email(),
  avatar: z.file().max(2 * 1024 * 1024), // 2MB max
});

export async function handleUpload() {
  const data = await upload();

  // TypeScript knows the exact types!
  console.log(data.name); // string
  console.log(data.email); // string
  console.log(data.avatar); // TempFile

  // Move file to destination
  await helpers.save(data.avatar, "./uploads/avatars");

  return { success: true, user: data.name };
}
```

## API Reference

### `createMultipart(schema, options?)`

Creates a type-safe multipart parser with Zod validation.

**Parameters:**

- `schema` - Zod schema object (`z.ZodRawShape`)
- `options` - Optional upload configuration

**Returns:** Async function that parses and validates multipart data

**Throws:** `ValidationError` when validation fails

## File Validation

### File Size Validation

Use `.max()` and `.min()` to validate file sizes.

```typescript
import { z } from "zod";
import { createMultipart } from "@minimajs/multipart/schema";

const upload = createMultipart({
  avatar: z
    .file()
    .min(1024) // Min 1KB
    .max(5 * 1024 * 1024), // Max 5MB
});
```

### MIME Type Validation

Use `.mime()` to validate file types.

```typescript
const upload = createMultipart({
  avatar: z
    .file()
    .max(2 * 1024 * 1024)
    .mime(["image/jpeg", "image/png", "image/webp"]),
});
```

All [Zod file validations](https://zod.dev/api?id=files) are supported.

## Multiple Files

### Array of Files

Use `z.array()` to handle multiple files.

```typescript
import { z } from "zod";
import { createMultipart } from "@minimajs/multipart/schema";
import { helpers } from "@minimajs/multipart";

const upload = createMultipart({
  email: z.string().email(),
  photos: z
    .array(z.file().max(5 * 1024 * 1024))
    .min(1) // At least 1 photo
    .max(10), // Max 10 photos
});

export async function handleGallery() {
  const data = await upload();

  // Process each photo
  for (const photo of data.photos) {
    await helpers.save(photo, "./uploads/gallery");
  }

  return { count: data.photos.length };
}
```

### TempFile Methods

```typescript
// Read as buffer
const buffer = await file.arrayBuffer();

// Read as text
const text = await file.text();

// Read as bytes
const bytes = await file.bytes();

// Get readable stream (Web Streams API)
const stream = file.stream();

// Get Node.js readable stream
const nodeStream = file.toReadable();

// Load into memory as standard File
const memoryFile = await file.toFile();

// Cleanup (delete temp file)
await file.destroy();
```

### Moving Files

Use `helpers.save()` to save files to their final destination.

```typescript
import { helpers } from "@minimajs/multipart";

const data = await upload();

// Auto-generated filename with UUID
const savedName = await helpers.save(data.avatar, "./uploads");
console.log(savedName); // e.g., "a1b2c3d4-e5f6.jpg"

// Custom filename
await helpers.save(data.avatar, "./uploads", "profile.jpg");
```

## Advanced Examples

### Complete User Profile Upload

```typescript
import { z } from "zod";
import { createMultipart } from "@minimajs/multipart/schema";
import { helpers } from "@minimajs/multipart";

const profileUpload = createMultipart({
  // Text fields
  username: z.string().min(3).max(20),
  email: z.string().email(),
  bio: z.string().max(500).optional(),

  // File fields
  avatar: z
    .file()
    .max(2 * 1024 * 1024)
    .mime(["image/jpeg", "image/png"]),

  coverPhoto: z
    .file()
    .max(5 * 1024 * 1024)
    .mime(["image/jpeg", "image/png"])
    .optional(),
});

export async function updateProfile() {
  const data = await profileUpload();

  // Save avatar
  const avatarPath = await helpers.save(data.avatar, "./uploads/avatars");

  // Save cover photo if provided
  let coverPath;
  if (data.coverPhoto) {
    coverPath = await helpers.save(data.coverPhoto, "./uploads/covers");
  }

  return {
    username: data.username,
    email: data.email,
    bio: data.bio,
    avatarUrl: `/uploads/avatars/${avatarPath}`,
    coverUrl: coverPath ? `/uploads/covers/${coverPath}` : null,
  };
}
```

## Upload Configuration

### Custom Options

Pass configuration options as the second parameter.

```typescript
import type { UploadOption } from "@minimajs/multipart/schema";

const options: UploadOption = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 5, // Max 5 files total
    fields: 10, // Max 10 text fields
  },
};

const upload = createMultipart(schema, options);
```

## Error Handling

The schema validation throws `ValidationError` when validation fails.

```typescript
import { ValidationError } from "@minimajs/multipart/schema";

export async function handleUpload() {
  try {
    const data = await upload();
    return { success: true, data };
  } catch (error) {
    if (error instanceof ValidationError) {
      // Handle validation errors
      return {
        success: false,
        errors: error.errors, // Array of validation errors
      };
    }
    throw error;
  }
}
```

## Type Safety

TypeScript automatically infers types from your schema.

```typescript
const upload = createMultipart({
  name: z.string(),
  age: z.number(),
  avatar: z.file(),
  photos: z.array(z.file()).optional(),
});

const data = await upload();
// TypeScript knows:
// data.name is string
// data.age is number
// data.avatar is TempFile
// data.photos is TempFile[] | undefined
```

## Cleanup

`TempFile` instances are stored on disk. They are **automatically cleaned up** after the request completes via Minima's `defer()` mechanism.

## Next Steps

- [Basic Multipart API](./index) - Lower-level multipart handling
