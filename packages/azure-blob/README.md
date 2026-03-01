# @minimajs/azure-blob

Azure Blob Storage driver for `@minimajs/disk`.

Use the Disk API (`put`, `get`, `list`, `copy`, `move`, `url`) with Azure Blob storage.

Built on `@minimajs/disk`, a fully web-native, API-compatible disk library.
All file-returning operations are Web `File`-compatible (`DiskFile` extends `File`).

## Installation

```bash
npm install @minimajs/azure-blob @minimajs/disk
# or
bun add @minimajs/azure-blob @minimajs/disk
```

## Quick start

```ts
import { createDisk } from "@minimajs/disk";
import { createAzureBlobDriver } from "@minimajs/azure-blob";

const disk = createDisk({
  driver: createAzureBlobDriver({
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    container: "uploads",
    publicUrl: "https://cdn.example.com", // optional
  }),
});

await disk.put("documents/report.pdf", pdfBuffer);

const file = await disk.get("documents/report.pdf");
if (file) {
  console.log(file.href);
  console.log(await file.arrayBuffer());
}
```

## Container modes

### Single container (configured in driver)

When `container` is configured, use normal keys:

```ts
await disk.put("images/avatar.png", imageBuffer);
```

### Multi-container (container not configured)

When `container` is omitted, use full Azure Blob URLs:

```ts
const disk = createDisk({
  driver: createAzureBlobDriver({
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
  }),
});

await disk.put("https://myaccount.blob.core.windows.net/container-a/file.txt", "A");
await disk.put("https://myaccount.blob.core.windows.net/container-b/file.txt", "B");
```

## Using an existing `BlobServiceClient`

```ts
import { BlobServiceClient } from "@azure/storage-blob";
import { createAzureBlobDriver } from "@minimajs/azure-blob";

const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);

const driver = createAzureBlobDriver(client, {
  container: "uploads",
  publicUrl: "https://cdn.example.com",
});
```

## Driver options

`createAzureBlobDriver(options)` accepts:

```ts
interface AzureBlobDriverOptions {
  connectionString: string;
  container?: string;
  publicUrl?: string;
}
```

## URL behavior

- If `publicUrl` is set, `disk.url(path)` returns `publicUrl + blob`.
- Otherwise, it returns the direct Azure Blob URL.

## Notes

- Metadata is supported (`capabilities.metadata = true`).
- `list(prefix, { limit })` is supported.

## Documentation

- https://minimajs.com/packages/disk/azure-blob

## License

MIT
