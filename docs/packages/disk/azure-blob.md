# Azure Blob Driver

**Azure Blob Storage driver for `@minimajs/disk`.** Use one File API across local and Azure environments while keeping Azure Blob as the storage backend.

## Features

- 🌐 **Web-Native APIs** - Use File, Blob, ReadableStream instead of Azure SDK methods
- ✅ **Streaming Uploads** - Efficient streaming uploads to Azure Blob Storage
- ✅ **Streaming Downloads** - Direct streaming from Azure without buffering
- ✅ **CDN Integration** - Configure Azure CDN or custom public URLs
- ✅ **Metadata Support** - Store and retrieve custom blob metadata
- ✅ **Server-Side Copy** - Fast native Azure copy operations via `beginCopyFromURL`
- ✅ **List Operations** - Paginated blob listing with prefix support
- ✅ **Multi-Container** - Work across multiple containers using full Azure URLs
- ✅ **Minimal Dependencies** - Only requires `@azure/storage-blob`

## Best Fit

Choose the Azure Blob driver when you need:

- managed object storage on Azure
- container-level separation across apps or tenants
- CDN/public URL delivery for static assets
- a shared API with non-Azure environments

## Installation

```bash
npm install @minimajs/azure-blob @minimajs/disk
# or
bun add @minimajs/azure-blob @minimajs/disk
```

## Usage

### Basic Configuration

```typescript
import { createAzureBlobDriver } from "@minimajs/azure-blob";
import { createDisk } from "@minimajs/disk";

const disk = createDisk({
  driver: createAzureBlobDriver({
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    container: "uploads",
  }),
});

// Web-native API - works like browser File API
const file = new File(["Hello World"], "hello.txt");
await disk.put(file); // Stored as "hello.txt" (original filename preserved)

// Use storeAs(...) plugin if you want UUID naming
// import { storeAs } from "@minimajs/disk/plugins";
// const disk = createDisk({ driver: createAzureBlobDriver({...}) }, storeAs("uuid"));

// Or specify path
await disk.put("avatars/photo.jpg", imageBuffer);

// Retrieve file - standard File methods
const retrieved = await disk.get("avatars/photo.jpg");
if (retrieved) {
  const buffer = await retrieved.arrayBuffer(); // Standard File.arrayBuffer()
  const text = await retrieved.text(); // Standard File.text()
  const stream = retrieved.stream(); // Standard File.stream()
}

// Delete file
await disk.delete("avatars/photo.jpg");
```

### With CDN URL

```typescript
const disk = createDisk({
  driver: createAzureBlobDriver({
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    container: "uploads",
    publicUrl: "https://mycdn.azureedge.net", // Azure CDN endpoint
  }),
});

await disk.put("images/logo.png", logoBuffer);

// Get CDN URL
const url = await disk.url("images/logo.png");
console.log(url); // https://mycdn.azureedge.net/images/logo.png
```

### Direct Azure Blob URL (without CDN)

When no `publicUrl` is set, `disk.url()` returns the direct Azure Blob Storage URL:

```typescript
const disk = createDisk({
  driver: createAzureBlobDriver({
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    container: "uploads",
  }),
});

const url = await disk.url("images/logo.png");
console.log(url);
// https://<account>.blob.core.windows.net/uploads/images/logo.png
```

### Multi-Container Setup

When `container` is NOT set in the driver, use full Azure Blob URLs:

```typescript
const disk = createDisk({
  driver: createAzureBlobDriver({
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    // No container specified
  }),
});

// Specify container in the full URL
await disk.put("https://<account>.blob.core.windows.net/images/logo.png", logoBuffer);
await disk.put("https://<account>.blob.core.windows.net/documents/report.pdf", pdfBuffer);

const file = await disk.get("https://<account>.blob.core.windows.net/images/logo.png");
```

### Using an Existing BlobServiceClient

If you already have a `BlobServiceClient` instance (e.g., with custom authentication), pass it directly:

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { createAzureBlobDriver } from "@minimajs/azure-blob";
import { createDisk } from "@minimajs/disk";

const client = new BlobServiceClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
  credential // DefaultAzureCredential, SAS token, etc.
);

const disk = createDisk({
  driver: createAzureBlobDriver(client, {
    container: "uploads",
    publicUrl: "https://mycdn.azureedge.net",
  }),
});
```

## Configuration

```typescript
interface AzureBlobDriverOptions {
  /**
   * Azure Storage connection string.
   * Required when not passing a BlobServiceClient directly.
   */
  connectionString: string;

  /**
   * Default container name.
   * Optional - can use full Azure Blob URLs instead.
   */
  container?: string;

  /**
   * Public URL for serving files (e.g., Azure CDN endpoint).
   * When set, disk.url() returns URLs with this prefix.
   */
  publicUrl?: string;
}
```

## Examples

### Upload with Metadata

```typescript
await disk.put("documents/report.pdf", pdfBuffer, {
  type: "application/pdf",
  metadata: {
    author: "Jane Doe",
    department: "Finance",
    year: "2024",
  },
});

// Retrieve with metadata
const file = await disk.get("documents/report.pdf");
console.log(file.type); // "application/pdf"
console.log(file.metadata); // { author: "Jane Doe", ... }
```

### Update Metadata

The `AzureBlobDriver` supports updating metadata and content type without re-uploading:

```typescript
import { AzureBlobDriver } from "@minimajs/azure-blob";

const driver = createAzureBlobDriver({ ... }) as AzureBlobDriver;

await driver.updateMetadata("documents/report.pdf", {
  type: "application/pdf",
  metadata: { reviewed: "true", reviewedBy: "admin" },
});
```

### List Blobs

```typescript
// List all blobs in the container
for await (const file of disk.list()) {
  console.log(file.href, file.size);
}

// List with prefix
for await (const file of disk.list("uploads/2024/")) {
  console.log(file.name, file.type, file.lastModified);
}

// List with limit
for await (const file of disk.list("uploads/", { limit: 50 })) {
  console.log(file.href);
}
```

### Copy and Move

```typescript
// Copy within same container
await disk.copy("originals/photo.jpg", "thumbnails/photo.jpg");

// Move (copy + delete source)
await disk.move("uploads/temp/file.jpg", "uploads/processed/file.jpg");

// Copy using DiskFile reference
const source = await disk.get("originals/photo.jpg");
await disk.copy(source, "backups/photo.jpg");
```

### Streaming Large Files

```typescript
// Upload a large file from a ReadableStream
const stream = fs.createReadStream("large-video.mp4");
await disk.put("videos/large-video.mp4", Readable.toWeb(stream));

// Stream download to HTTP response
const file = await disk.get("videos/large-video.mp4");
return new Response(file.stream(), {
  headers: {
    "Content-Type": file.type,
    "Content-Length": String(file.size),
  },
});
```

### Concurrent Operations

```typescript
// Upload multiple files in parallel
await Promise.all([disk.put("file1.txt", "Data 1"), disk.put("file2.txt", "Data 2"), disk.put("file3.txt", "Data 3")]);

// Download multiple files in parallel
const [file1, file2] = await Promise.all([disk.get("file1.txt"), disk.get("file2.txt")]);
```

## Azure Credentials

### Connection String (simplest)

```bash
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
```

```typescript
const disk = createDisk({
  driver: createAzureBlobDriver({
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    container: "uploads",
  }),
});
```

### Managed Identity / DefaultAzureCredential

For production deployments on Azure (App Service, AKS, Azure Functions), use `DefaultAzureCredential` for passwordless auth:

```bash
npm install @azure/identity
```

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { createAzureBlobDriver } from "@minimajs/azure-blob";
import { createDisk } from "@minimajs/disk";

const client = new BlobServiceClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
  new DefaultAzureCredential()
);

const disk = createDisk({
  driver: createAzureBlobDriver(client, { container: "uploads" }),
});
```

### SAS Token

```typescript
import { BlobServiceClient } from "@azure/storage-blob";

const client = new BlobServiceClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net?${process.env.AZURE_SAS_TOKEN}`
);

const disk = createDisk({
  driver: createAzureBlobDriver(client, { container: "uploads" }),
});
```

## href Format

Azure Blob Storage hrefs follow the standard Azure URL format:

```
https://<account>.blob.core.windows.net/<container>/<blob-path>
```

When `publicUrl` is configured and `disk.url()` is called, the returned URL uses the CDN prefix instead:

```
https://<cdn>.azureedge.net/<blob-path>
```

All disk operations (`get`, `copy`, `move`, `delete`) accept both the full Azure URL and plain paths (when `container` is configured):

```typescript
// These are equivalent when container: "uploads" is set
await disk.get("avatars/photo.jpg");
await disk.get("https://<account>.blob.core.windows.net/uploads/avatars/photo.jpg");
```

## Error Handling

```typescript
import { DiskFileNotFoundError, DiskWriteError, DiskReadError } from "@minimajs/disk";

try {
  const file = await disk.get("missing.txt");
} catch (error) {
  if (error instanceof DiskFileNotFoundError) {
    console.log("Blob not found:", error.href);
  } else if (error instanceof DiskReadError) {
    console.log("Failed to read blob:", error.message);
  }
}

try {
  await disk.put("uploads/photo.jpg", imageBuffer);
} catch (error) {
  if (error instanceof DiskWriteError) {
    console.log("Failed to upload blob:", error.message);
  }
}
```

## See Also

- [Core Disk Package](./index.md) - Main documentation
- [AWS S3 Driver](./aws-s3.md) - Amazon S3 storage
- [Protocol Disk](./protocol-disk.md) - Multi-cloud routing
- [Filesystem Driver](./filesystem.md) - Local filesystem storage

## Key Benefits

- Use one application-level API across local, Azure, S3, and memory drivers.
- Keep stream-based transfers for large file workflows.
- Integrate with CDN/public URL patterns without changing app logic.
- Add naming, partitioning, and security policies through plugins.
