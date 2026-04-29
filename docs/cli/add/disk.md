---
title: disk
sidebar_position: 1
---

# minimajs add disk

Scaffolds a disk storage instance and installs the required packages.

```bash
./app add disk            # src/disks/index.ts  →  export const disk = createDisk()
./app add disk uploads    # src/disks/uploads.ts →  export const uploads = createDisk()
```

## Drivers

Use `--driver` to specify a storage backend. Defaults to `file` (local filesystem).

```bash
./app add disk --driver=aws-s3
./app add disk uploads --driver=azure-blob
```

| Driver       | Package                | Description        |
| ------------ | ---------------------- | ------------------ |
| `file`       | `@minimajs/disk`       | Local filesystem   |
| `aws-s3`     | `@minimajs/aws-s3`     | AWS S3             |
| `azure-blob` | `@minimajs/azure-blob` | Azure Blob Storage |

## ProtoDisk

Use `--proto` to create a `ProtoDisk` that routes operations to different providers by URL prefix. Useful for multi-cloud architectures.

```bash
./app add disk router --proto
```

Generated file (`src/disks/router.ts`):

```ts
import { createProtoDisk } from "@minimajs/disk";

export const router = createProtoDisk({
  protocols: {
    // "s3://": createS3Driver({ bucket: process.env.AWS_BUCKET!, region: process.env.AWS_REGION! }),
    // "https://cdn.example.com/": createAzureBlobDriver({ ... }),
  },
  defaultProtocol: "file://",
});
```

## Generated files

All disks are placed under `src/disks/`. Omitting the name creates `index.ts` with the export named `disk`.

| Command                         | File                      | Export              |
| ------------------------------- | ------------------------- | ------------------- |
| `add disk`                      | `src/disks/index.ts`      | `export const disk` |
| `add disk uploads`              | `src/disks/uploads.ts`    | `export const uploads` |
| `add disk cdn --driver aws-s3`  | `src/disks/cdn.ts`        | `export const cdn`  |
| `add disk router --proto`       | `src/disks/router.ts`     | `export const router` |

## Options

| Flag           | Default | Description                           |
| -------------- | ------- | ------------------------------------- |
| `[name]`       | —       | Disk name — omit to create `index.ts` |
| `--driver`     | `file`  | Storage driver (ignored with `--proto`) |
| `--proto`      | `false` | Create a `ProtoDisk` instance         |
| `--no-install` | —       | Skip dependency installation          |

## Examples

```bash
# Default disk (src/disks/index.ts)
./app add disk

# Named disk with S3 driver
./app add disk uploads --driver=aws-s3

# Multi-provider ProtoDisk
./app add disk media --proto

# Skip install
./app add disk --driver=aws-s3 --no-install
```
