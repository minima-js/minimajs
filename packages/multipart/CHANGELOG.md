# @minimajs/multipart

## 1.2.0

### Minor Changes

- ccdfbbb: Native File API Support

  This release brings comprehensive multipart handling with native Web File API compatibility:

  **Four Consumption Modes:**
  - `multipart` - Buffered (small files, simple uploads)
  - `streaming` - Lazy buffer (recommended for large files)
  - `raw` - Unbuffered streams (advanced use cases)
  - `schema` - Disk-backed with Zod validation (type-safe uploads)

  **Key Features:**
  - Native File API compatibility - `TempFile` and `StreamFile` extend Web `File`
  - Return files directly from handlers with correct Content-Type
  - Zod validation with `z.file().mime().max()` for type-safe uploads
  - Automatic temp file cleanup via `defer()` mechanism
  - Comprehensive `helpers` module for file operations
  - Memory-efficient streaming for large files

  **Breaking Changes:**
  - Use `multipart.body()` instead of `multipart()`
  - File API: `file.stream()` is now a method (was property)
  - File API: `file.name` replaces `file.filename`

  See documentation for migration guide and examples.

### Patch Changes

- Updated dependencies [9f5fe69]
  - @minimajs/server@0.8.0

## 1.1.0

### Minor Changes

- b3c1c3c: re-written more DX friendly ever.

### Patch Changes

- Updated dependencies [b3c1c3c]
  - @minimajs/server@0.4.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @minimajs/server@0.3.0
