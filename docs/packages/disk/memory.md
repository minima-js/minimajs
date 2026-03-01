# Memory Driver

In-memory storage driver for testing and development. Data is stored in RAM and will be lost when the process exits.

## Best Fit

Use the memory driver when:

- tests should be isolated and fast
- local prototyping should avoid external dependencies
- you need deterministic behavior without filesystem/network variability

## Features

- ✅ **Fast** - No I/O operations, everything in memory
- ✅ **Simple** - No setup required
- ✅ **Testing** - Perfect for unit tests with `clear()` method
- ✅ **Development** - Quick prototyping without cloud services

## Installation

The memory driver is included in `@minimajs/disk`:

```bash
npm install @minimajs/disk
# or
bun add @minimajs/disk
```

## Usage

### Basic Usage

```typescript
import { createDisk } from "@minimajs/disk";
import { createMemoryDriver } from "@minimajs/disk/adapters";

const memoryDriver = createMemoryDriver();
const disk = createDisk({ driver: memoryDriver });

// Use like any other disk
await disk.put("test.txt", "Hello World");
const file = await disk.get("test.txt");

if (file) {
  const text = await file.text();
  console.log(text); // "Hello World"
}
```

### Testing Example

```typescript
import { createDisk } from "@minimajs/disk";
import { createMemoryDriver } from "@minimajs/disk/adapters";
import { describe, test, beforeEach, afterEach } from "@jest/globals";
import assert from "node:assert/strict";

describe("File Upload Service", () => {
  let memoryDriver;
  let disk;

  beforeEach(() => {
    memoryDriver = createMemoryDriver();
    disk = createDisk({ driver: memoryDriver });
  });

  afterEach(() => {
    // Clear all data after each test
    memoryDriver.clear();
  });

  test("uploads file successfully", async () => {
    const file = await disk.put("uploads/avatar.jpg", imageData);

    assert.ok(await disk.exists("uploads/avatar.jpg"));
    assert.equal(file.size, imageData.byteLength);
  });

  test("copies file", async () => {
    await disk.put("original.txt", "content");
    await disk.copy("original.txt", "copy.txt");

    assert.ok(await disk.exists("original.txt"));
    assert.ok(await disk.exists("copy.txt"));
  });
});
```

### With Public URLs

```typescript
import { createDisk } from "@minimajs/disk";
import { createMemoryDriver } from "@minimajs/disk/adapters";

const memoryDriver = createMemoryDriver({
  publicUrl: "http://localhost:3000/files",
});

const disk = createDisk({ driver: memoryDriver });

await disk.put("avatar.jpg", imageData);

const url = await disk.url("avatar.jpg");
console.log(url); // http://localhost:3000/files/avatar.jpg
```

### Development Server Example

```typescript
import { createDisk } from "@minimajs/disk";
import { createMemoryDriver } from "@minimajs/disk/adapters";
import express from "express";

const memoryDriver = createMemoryDriver({
  publicUrl: "http://localhost:3000/uploads",
});

const disk = createDisk({ driver: memoryDriver });

const app = express();

app.post("/upload", async (req, res) => {
  const file = await disk.put("uploads/" + req.file.name, req.file.data);
  res.json({ url: await disk.url(file.href) });
});

app.get("/uploads/:file", async (req, res) => {
  const file = await disk.get("uploads/" + req.params.file);
  if (!file) return res.status(404).send("Not found");

  const stream = file.stream();
  const reader = stream.getReader();

  res.setHeader("Content-Type", file.type);
  res.setHeader("Content-Length", file.size.toString());

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
});

app.listen(3000);
```

## API

### `createMemoryDriver(options?)`

Creates a new memory driver instance.

**Options:**

- `publicUrl?: string` - Base URL for generating public URLs (optional)

**Returns:** `MemoryDriver` (implements `DiskDriver`)

### Special Methods

#### `clear()`

Clears all stored data from memory. Useful for cleanup between tests.

```typescript
const driver = createMemoryDriver();
driver.clear(); // Remove all files
```

## Comparison with Other Drivers

| Feature     | Memory          | Filesystem    | S3            |
| ----------- | --------------- | ------------- | ------------- |
| Speed       | ⚡ Fastest      | 🚀 Fast       | 🌐 Network    |
| Persistence | ❌ Lost on exit | ✅ Persistent | ✅ Persistent |
| Setup       | ✅ None         | ✅ Simple     | 🔧 AWS config |
| Use Case    | Testing         | Local files   | Production    |

## When to Use

### ✅ Good For:

- Unit tests
- Integration tests
- Quick prototyping
- Development without cloud setup
- CI/CD pipelines (fast tests)
- Mocking storage in demos

### ❌ Not Good For:

- Production (data lost on restart)
- Large files (limited by RAM)
- Data persistence requirements
- Multi-process applications
- Distributed systems

## Stream Behavior

The memory driver supports multiple stream reads:

```typescript
const file = await disk.put("test.txt", "Hello World");

// First read - uses stored data
const stream1 = file.stream();
const text1 = await new Response(stream1).text(); // "Hello World"

// Second read - creates new stream from stored data
const stream2 = file.stream();
const text2 = await new Response(stream2).text(); // "Hello World"
```

## Notes

- All data is stored in memory and lost when the process exits
- No file size limits other than available RAM
- Thread-safe within a single Node.js process
- Not shared between processes or instances
- `href` format: `/path/to/file` (no protocol prefix)

## See Also

- [Main Documentation](./index.md)
- [Testing Strategies](./examples.md#testing-strategies)
- [Filesystem Driver](./filesystem.md)
- [Decision Guide](./decision-guide.md)
