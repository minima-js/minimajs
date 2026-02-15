# @minimajs/azure-blob

Azure Blob Storage driver for [@minimajs/disk](../disk).

## Features

- ✅ **Streaming uploads** - Efficient streaming uploads to Azure Blob Storage
- ✅ **Streaming downloads** - Direct streaming from Azure without buffering
- ✅ **SAS URLs** - Generate shared access signature URLs
- ✅ **Metadata support** - Store and retrieve custom metadata
- ✅ **Server-side copy** - Fast native Azure copy operations
- ✅ **List operations** - Paginated file listing with prefix support
- ✅ **Access tiers** - Support for Hot, Cool, and Archive tiers
- ✅ **Encryption** - Server-side encryption support

## Installation

```bash
npm install @minimajs/azure-blob @minimajs/disk
# or
bun add @minimajs/azure-blob @minimajs/disk
```

## Basic Usage

### With Container in Driver Config

```typescript
import { createAzureBlobDriver } from "@minimajs/azure-blob";
import { createDisk } from "@minimajs/disk";

const disk = createDisk({
  driver: createAzureBlobDriver({
    accountName: "myaccount",
    accountKey: process.env.AZURE_STORAGE_KEY!,
    container: "my-container",
  }),
});

// Store file
await disk.put("uploads/document.pdf", pdfBuffer);

// Retrieve file
const file = await disk.get("uploads/document.pdf");
const buffer = await file.arrayBuffer();

// Delete file
await disk.delete("uploads/document.pdf");
```

### Without Container (Multi-Container)

Use full `azure://` URLs:

```typescript
const disk = createDisk({
  driver: createAzureBlobDriver({
    accountName: "myaccount",
    accountKey: process.env.AZURE_STORAGE_KEY!,
  }),
});

// Specify container in path
await disk.put("azure://container-1/file.txt", data);
await disk.put("azure://container-2/file.txt", data);
```

## Configuration

```typescript
interface AzureBlobDriverOptions {
  /**
   * Azure Storage account name
   */
  accountName: string;

  /**
   * Azure Storage account key or SAS token
   */
  accountKey?: string;

  /**
   * Connection string (alternative to accountName + accountKey)
   */
  connectionString?: string;

  /**
   * Default container name (optional)
   */
  container?: string;

  /**
   * Access tier for new blobs
   * @default "Hot"
   */
  accessTier?: "Hot" | "Cool" | "Archive";

  /**
   * Blob service endpoint (for custom domains)
   */
  endpoint?: string;
}
```

## Examples

### Upload with Metadata

```typescript
await disk.put("documents/report.pdf", pdfData, {
  type: "application/pdf",
  metadata: {
    author: "John Doe",
    department: "Finance",
  },
});

const file = await disk.get("documents/report.pdf");
console.log(file.metadata); // { author: "John Doe", ... }
```

### Access Tiers

```typescript
// Hot tier (default) - frequent access
const hotStorage = createAzureBlobDriver({
  accountName: "myaccount",
  accountKey: process.env.AZURE_STORAGE_KEY!,
  container: "hot-data",
  accessTier: "Hot",
});

// Cool tier - infrequent access (cheaper)
const coolStorage = createAzureBlobDriver({
  accountName: "myaccount",
  accountKey: process.env.AZURE_STORAGE_KEY!,
  container: "cool-data",
  accessTier: "Cool",
});

// Archive tier - long-term storage (cheapest)
const archiveStorage = createAzureBlobDriver({
  accountName: "myaccount",
  accountKey: process.env.AZURE_STORAGE_KEY!,
  container: "archive",
  accessTier: "Archive",
});
```

### List Files

```typescript
// List all files with prefix
for await (const file of disk.list("uploads/2024/")) {
  console.log(file.name, file.size, file.lastModified);
}
```

## Documentation

For comprehensive documentation and examples, visit:

- [Complete Documentation](../../docs/packages/disk/)

## License

MIT
