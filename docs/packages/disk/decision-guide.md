# Disk Decision Guide

Practical guidance for choosing drivers, plugins, and architecture patterns in `@minimajs/disk`.

## 1) Choose a Driver

| Need | Recommended choice | Why |
|---|---|---|
| Local development, simple deployment | Filesystem (`createFsDriver`) | Fast setup, direct file access |
| Unit/integration tests | Memory (`createMemoryDriver`) | Isolated and fast, easy reset with `clear()` |
| Durable object storage on AWS | S3 (`createS3Driver`) | Scalability, lifecycle, IAM/KMS, ecosystem |
| Durable object storage on Azure | Azure Blob (`createAzureBlobDriver`) | Native Azure integration, container model |
| Multiple backends at once | ProtoDisk (`createProtoDisk`) | Prefix-based routing and cross-driver copy/move |

## 2) Choose a Naming Strategy

- Keep original file names: default `put(file)` behavior.
- Ensure uniqueness globally: `storeAs("uuid")`.
- Keep original name for UX while ensuring uniqueness: `storeAs("uuid-original")`.
- Organize by date/hash/domain:
  - `partition({ by: "date" })` for human-readable time buckets.
  - `partition({ by: "hash" })` for high directory cardinality.

## 3) Add Reliability and Security

Use plugins as a pipeline:

1. Path/name: `storeAs`, `partition`
2. Transform: `compression`
3. Security: `encryption`
4. Integrity/safety: `checksum`, `atomicWrite`
5. Visibility: `uploadProgress`, `downloadProgress`

## 4) Scale Architecture Gradually

1. Start local:
   - `createDisk()` or filesystem driver
2. Move to cloud:
   - swap in S3/Azure driver, keep app API unchanged
3. Introduce topology:
   - use `createProtoDisk` for multi-tenant, hot/warm/cold, or cross-region routing

## 5) Common Production Profiles

### Public assets

- Driver: S3 or Azure
- Plugins: `storeAs("uuid")`, optional `partition({ by: "date" })`
- URL: configure `publicUrl`/CDN

### Private documents (compliance-sensitive)

- Driver: S3/Azure
- Plugins: `storeAs("uuid-original")`, `partition`, `encryption`, `checksum`
- URL: signed URLs only (`disk.url(..., { expiresIn })`)

### Media uploads (large files)

- Driver: S3/Azure
- Plugins: progress plugins for observability
- Pattern: stream-first ingest and transform pipeline

### Test environments

- Driver: memory
- Pattern: recreate driver per test or call `clear()` in hooks

## See Also

- [Main Documentation](./index.md)
- [Examples](./examples.md)
- [Plugins](./plugins.md)
- [Filesystem Driver](./filesystem.md)
- [AWS S3 Driver](./aws-s3.md)
- [Azure Blob Driver](./azure-blob.md)
- [Protocol Disk](./protocol-disk.md)
