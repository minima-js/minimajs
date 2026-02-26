# Examples

Comprehensive examples showing real-world usage patterns for `@minimajs/disk`.

## Table of Contents

- [Basic Operations](#basic-operations)
- [Image Processing](#image-processing)
- [PDF Generation](#pdf-generation)
- [File Uploads](#file-uploads)
- [Backup & Sync](#backup--sync)
- [Testing Strategies](#testing-strategies)
- [Production Patterns](#production-patterns)

## Basic Operations

### Upload and Download

```typescript
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters/fs";

const disk = createDisk({
  driver: createFsDriver({ root: "./storage" }),
});

// Upload text file
const textFile = await disk.put("documents/readme.txt", "Hello, World!", { type: "text/plain" });
console.log(textFile.href); // file:///storage/documents/readme.txt

// Download as text
const file = await disk.get("documents/readme.txt");
const text = await file.text();
console.log(text); // Hello, World!

// Download as buffer
const buffer = await file.arrayBuffer();

// Download as stream
const stream = file.stream();
```

### Check Existence

```typescript
// Check if file exists
const exists = await disk.exists("documents/readme.txt");
console.log(exists); // true

// Get file or null
const file = await disk.get("documents/missing.txt");
if (!file) {
  console.log("File not found");
}

// Try/catch approach
try {
  const file = await disk.get("documents/missing.txt");
} catch (error) {
  if (error instanceof DiskFileNotFoundError) {
    console.log("File not found");
  }
}
```

### Copy and Move

```typescript
// Copy file
await disk.copy("documents/readme.txt", "backups/readme-backup.txt");

// Move file
await disk.move("documents/temp.txt", "documents/permanent.txt");

// Copy with overwrite
await disk.copy("documents/source.txt", "documents/destination.txt", { overwrite: true });
```

### List Files

```typescript
// List all files
for await (const file of disk.list()) {
  console.log(file.href, file.size, file.lastModified);
}

// List with prefix
for await (const file of disk.list("documents/2024/")) {
  console.log(file.name);
}

// List with limit
let count = 0;
for await (const file of disk.list("documents/")) {
  console.log(file.href);
  if (++count >= 10) break; // Only list 10 files
}
```

## Image Processing

### Avatar Upload with Thumbnails

```typescript
import { createDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";
import sharp from "sharp";

const disk = createDisk({
  driver: createS3Driver({
    bucket: "user-avatars",
    region: "us-east-1",
    credentials: {
      /* ... */
    },
    acl: "public-read",
  }),
});

async function uploadAvatar(userId: string, imageBuffer: Buffer) {
  // Original image
  const original = await disk.put(`avatars/${userId}/original.jpg`, imageBuffer, { type: "image/jpeg" });

  // Large thumbnail (800x800)
  const largeThumbnail = await sharp(imageBuffer).resize(800, 800, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer();

  const large = await disk.put(`avatars/${userId}/large.jpg`, largeThumbnail, { type: "image/jpeg" });

  // Medium thumbnail (400x400)
  const mediumThumbnail = await sharp(imageBuffer).resize(400, 400, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer();

  const medium = await disk.put(`avatars/${userId}/medium.jpg`, mediumThumbnail, { type: "image/jpeg" });

  // Small thumbnail (100x100)
  const smallThumbnail = await sharp(imageBuffer).resize(100, 100, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();

  const small = await disk.put(`avatars/${userId}/small.jpg`, smallThumbnail, { type: "image/jpeg" });

  return {
    original: await disk.url(original.href),
    large: await disk.url(large.href),
    medium: await disk.url(medium.href),
    small: await disk.url(small.href),
  };
}

// Usage
const urls = await uploadAvatar("user-123", avatarBuffer);
console.log(urls.small); // https://...
```

### Image Watermarking

```typescript
async function addWatermark(inputPath: string, outputPath: string) {
  // Get original image
  const original = await disk.get(inputPath);
  const imageBuffer = Buffer.from(await original.arrayBuffer());

  // Add watermark
  const watermarked = await sharp(imageBuffer)
    .composite([
      {
        input: await sharp({
          text: {
            text: "© 2024 MyApp",
            font: "Arial",
            rgba: true,
          },
        })
          .png()
          .toBuffer(),
        gravity: "southeast",
      },
    ])
    .toBuffer();

  // Save watermarked image
  await disk.put(outputPath, watermarked, {
    type: original.type,
  });
}

await addWatermark("uploads/photo.jpg", "processed/photo-watermarked.jpg");
```

## PDF Generation

### Invoice Generator

```typescript
import { createDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";
import PDFDocument from "pdfkit";

const disk = createDisk({
  driver: createS3Driver({
    bucket: "invoices",
    region: "us-east-1",
    credentials: {
      /* ... */
    },
  }),
});

interface Invoice {
  id: string;
  customerName: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  total: number;
}

async function generateInvoice(invoice: Invoice): Promise<string> {
  // Create PDF in memory
  const chunks: Buffer[] = [];
  const doc = new PDFDocument();

  doc.on("data", (chunk) => chunks.push(chunk));

  // PDF content
  doc.fontSize(20).text(`Invoice #${invoice.id}`, 100, 100);
  doc.fontSize(12).text(`Customer: ${invoice.customerName}`, 100, 150);

  let y = 200;
  invoice.items.forEach((item) => {
    doc.text(`${item.name} x${item.quantity} - $${item.price * item.quantity}`, 100, y);
    y += 20;
  });

  doc.fontSize(16).text(`Total: $${invoice.total}`, 100, y + 20);
  doc.end();

  // Wait for PDF to finish
  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Upload to S3
  const file = await disk.put(`invoices/${invoice.id}.pdf`, pdfBuffer, {
    type: "application/pdf",
    metadata: {
      invoiceId: invoice.id,
      customerName: invoice.customerName,
      generatedAt: new Date().toISOString(),
    },
  });

  // Generate signed URL (expires in 7 days)
  return await disk.url(file.href, { expiresIn: 604800 });
}

// Usage
const invoiceUrl = await generateInvoice({
  id: "INV-2024-001",
  customerName: "John Doe",
  items: [
    { name: "Widget A", price: 10, quantity: 2 },
    { name: "Widget B", price: 15, quantity: 1 },
  ],
  total: 35,
});

console.log(invoiceUrl); // https://...
```

## File Uploads

### Multipart Upload Handler

```typescript
import { createDisk, storeAs } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";
import { Application } from "@minimajs/server";
import { multipart } from "@minimajs/multipart";

const app = new Application();

// storeAs("uuid-original") renames files to "<uuid>-originalname.ext" automatically
const disk = createDisk(
  {
    driver: createS3Driver({
      bucket: "uploads",
      region: "us-east-1",
      credentials: {
        /* ... */
      },
    }),
  },
  storeAs("uuid-original")
);

app.use(multipart());

app.post("/upload", async (ctx) => {
  const files = ctx.get("files");

  if (!files || files.length === 0) {
    return ctx.json({ error: "No files uploaded" }, 400);
  }

  const uploadedFiles = await Promise.all(
    files.map(async (file) => {
      // Put the File directly — storeAs generates a unique name automatically
      // file.metadata.originalName holds the original filename
      const uploaded = await disk.put(file, {
        metadata: {
          uploadedBy: ctx.get("userId") ?? "anonymous",
          uploadedAt: new Date().toISOString(),
        },
      });

      // Generate public URL
      const url = await disk.url(uploaded.href);

      return {
        name: uploaded.metadata.originalName ?? uploaded.name,
        size: uploaded.size,
        type: uploaded.type,
        url,
      };
    })
  );

  return ctx.json({ files: uploadedFiles });
});
```

### File Size Validation

```typescript
import { DiskWriteError } from "@minimajs/disk";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function uploadWithValidation(path: string, file: File): Promise<string> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file.size} bytes`);
  }

  // Check file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}`);
  }

  try {
    // Upload
    const uploaded = await disk.put(path, file, {
      type: file.type,
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    return await disk.url(uploaded.href);
  } catch (error) {
    if (error instanceof DiskWriteError) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    throw error;
  }
}
```

## Backup & Sync

### Cross-Storage Backup

```typescript
import { createProtocolDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";

// Primary storage (S3)
const primary = createS3Driver({
  bucket: "prod-data",
  region: "us-east-1",
  credentials: {
    /* ... */
  },
});

// Backup storage (Different region)
const backup = createS3Driver({
  bucket: "backup-data",
  region: "us-west-2",
  credentials: {
    /* ... */
  },
});

const disk = createProtocolDisk({
  protocols: {
    "s3://prod-data/": primary,
    "s3://backup-data/": backup,
  },
});

async function backupFile(path: string): Promise<void> {
  const primaryPath = `s3://prod-data/${path}`;
  const backupPath = `s3://backup-data/${path}`;

  // Check if file exists in primary
  if (!(await disk.exists(primaryPath))) {
    throw new Error(`File not found: ${path}`);
  }

  // Copy to backup (streams data between regions)
  await disk.copy(primaryPath, backupPath, { overwrite: true });

  console.log(`Backed up: ${path}`);
}

// Backup multiple files
const filesToBackup = ["documents/important.pdf", "data/export.csv"];
await Promise.all(filesToBackup.map(backupFile));
```

### Scheduled Backup

```typescript
import { CronJob } from "cron";

// Backup job (runs daily at 2 AM)
const backupJob = new CronJob("0 2 * * *", async () => {
  console.log("Starting daily backup...");

  const files = [];
  for await (const file of disk.list("s3://prod-data/")) {
    files.push(file);
  }

  console.log(`Found ${files.length} files to backup`);

  let backed = 0;
  for (const file of files) {
    try {
      const path = file.href.replace("s3://prod-data/", "");
      await backupFile(path);
      backed++;
    } catch (error) {
      console.error(`Failed to backup ${file.href}:`, error);
    }
  }

  console.log(`Backup complete: ${backed}/${files.length} files`);
});

backupJob.start();
```

## Testing Strategies

### Memory Driver for Tests

```typescript
import { createDisk } from "@minimajs/disk";
import { createMemoryDriver } from "@minimajs/disk/adapters/memory";
import { describe, it, expect, beforeEach } from "@jest/globals";

describe("FileService", () => {
  let disk: ReturnType<typeof createDisk>;

  beforeEach(() => {
    // Fresh memory storage for each test
    disk = createDisk({
      driver: createMemoryDriver(),
    });
  });

  it("should upload and download files", async () => {
    // Upload
    await disk.put("test.txt", "Hello, World!");

    // Download
    const file = await disk.get("test.txt");
    expect(await file.text()).toBe("Hello, World!");
  });

  it("should handle missing files", async () => {
    const file = await disk.get("missing.txt");
    expect(file).toBeNull();
  });

  it("should list files", async () => {
    await disk.put("file1.txt", "Content 1");
    await disk.put("file2.txt", "Content 2");
    await disk.put("file3.txt", "Content 3");

    const files = [];
    for await (const file of disk.list()) {
      files.push(file);
    }

    expect(files).toHaveLength(3);
  });
});
```

### Mocking External Storage

```typescript
import { describe, it, expect, vi } from "vitest";

describe("ImageProcessor", () => {
  it("should process and upload images", async () => {
    // Mock disk operations
    const mockDisk = {
      put: vi.fn().mockResolvedValue({
        href: "s3://bucket/image.jpg",
        type: "image/jpeg",
        size: 1024,
      }),
      url: vi.fn().mockResolvedValue("https://cdn.example.com/image.jpg"),
    };

    const processor = new ImageProcessor(mockDisk);

    const result = await processor.processAvatar("user-123", imageBuffer);

    expect(mockDisk.put).toHaveBeenCalledWith("avatars/user-123/original.jpg", expect.any(Buffer), { type: "image/jpeg" });

    expect(result).toEqual({
      url: "https://cdn.example.com/image.jpg",
    });
  });
});
```

## Production Patterns

### Environment-Based Storage

```typescript
import { createProtocolDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";
import { createFsDriver } from "@minimajs/disk/adapters/fs";

function createStorageDisk() {
  if (process.env.NODE_ENV === "production") {
    // Production: Use S3
    return createDisk({
      driver: createS3Driver({
        bucket: process.env.S3_BUCKET!,
        region: process.env.AWS_REGION!,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      }),
    });
  } else {
    // Development: Use filesystem
    return createDisk({
      driver: createFsDriver({
        root: "./storage",
      }),
    });
  }
}

export const disk = createStorageDisk();
```

### CDN Integration

```typescript
const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    credentials: {
      /* ... */
    },
    acl: "public-read",
  }),
});

async function uploadWithCDN(path: string, data: Buffer | ReadableStream): Promise<string> {
  // Upload to S3
  const file = await disk.put(path, data);

  // Return CloudFront URL instead of S3 URL
  const cdnDomain = process.env.CDN_DOMAIN!; // d1234567890.cloudfront.net
  const cdnUrl = `https://${cdnDomain}/${path}`;

  return cdnUrl;
}
```

### Error Recovery

```typescript
import { DiskWriteError, DiskReadError, DiskFileNotFoundError } from "@minimajs/disk";

async function uploadWithRetry(path: string, data: Buffer, maxRetries = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const file = await disk.put(path, data);
      return await disk.url(file.href);
    } catch (error) {
      lastError = error as Error;

      if (error instanceof DiskWriteError) {
        console.error(`Upload attempt ${attempt}/${maxRetries} failed:`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
          continue;
        }
      }

      // Non-recoverable error
      throw error;
    }
  }

  throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError?.message}`);
}
```

### Cleanup Old Files

```typescript
async function cleanupOldFiles(olderThanDays: number): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  let deletedCount = 0;

  for await (const file of disk.list("temp/")) {
    if (file.lastModified < cutoff) {
      try {
        await disk.delete(file.href);
        deletedCount++;
        console.log(`Deleted: ${file.href}`);
      } catch (error) {
        console.error(`Failed to delete ${file.href}:`, error);
      }
    }
  }

  return deletedCount;
}

// Run cleanup daily
import { CronJob } from "cron";
new CronJob("0 3 * * *", async () => {
  const deleted = await cleanupOldFiles(30); // Delete files older than 30 days
  console.log(`Cleanup complete: ${deleted} files deleted`);
}).start();
```

## See Also

- [Main Documentation](./index.md)
- [AWS S3 Driver](./aws-s3.md)
- [Protocol Disk](./protocol-disk.md)
- [Memory Driver](./memory.md)
- [Filesystem Driver](./filesystem.md)
