---
title: disk
sidebar_position: 1
---

# minimajs add disk

Adds file storage to your project using `@minimajs/disk`.

```bash
minimajs add disk
```

## Drivers

Use `--driver` to specify a storage backend. Defaults to `file` (local filesystem).

```bash
minimajs add disk --driver=aws-s3
minimajs add disk --driver=azure-blob
```

| Driver       | Package                | Description        |
| ------------ | ---------------------- | ------------------ |
| `file`       | `@minimajs/disk`       | Local filesystem   |
| `aws-s3`     | `@minimajs/aws-s3`     | AWS S3             |
| `azure-blob` | `@minimajs/azure-blob` | Azure Blob Storage |

## Generated Files

Each driver creates its own file under `src/shared/`, so you can add multiple drivers independently. Running the same driver twice skips the file if it already exists.

| Driver       | File                            |
| ------------ | ------------------------------- |
| `file`       | `src/shared/disk.ts`            |
| `aws-s3`     | `src/shared/aws-s3.disk.ts`     |
| `azure-blob` | `src/shared/azure-blob.disk.ts` |

## Options

| Flag           | Default | Description                  |
| -------------- | ------- | ---------------------------- |
| `--driver`     | `file`  | Storage driver               |
| `--no-install` | —       | Skip dependency installation |

## Examples

```bash
# Local filesystem (default)
minimajs add disk

# AWS S3
minimajs add disk --driver=aws-s3

# Azure Blob
minimajs add disk --driver=azure-blob

# Skip install
minimajs add disk --driver=aws-s3 --no-install
```
