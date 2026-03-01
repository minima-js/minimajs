# @minimajs/disk

Web-native file storage for Node.js and Bun.

Use the same API for filesystem, S3, Azure Blob, memory, or custom drivers.

`@minimajs/disk` is a standalone package and does not require the Minima.js framework.

## Why use it

- One storage API across providers
- Works with `File`, `Blob`, and `ReadableStream`
- No provider SDK lock-in at call-site
- Type-safe return values (`DiskFile`)
- Optional plugins (`storeAs`, `partition`, `atomicWrite`, `compression`, `encryption`, and more)
- Protocol-based routing with `createProtoDisk()`

## Installation

```bash
npm install @minimajs/disk
# or
bun add @minimajs/disk
```

Provider packages:

```bash
npm install @minimajs/aws-s3
npm install @minimajs/azure-blob
```

## Quick start

### Filesystem driver

```ts
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";

const disk = createDisk({
  driver: createFsDriver({
    root: "file:///var/uploads/",
  }),
});

await disk.put("documents/readme.txt", "Hello, World!");

const file = await disk.get("documents/readme.txt");
if (file) {
  console.log(file.href); // file:///var/uploads/documents/readme.txt
  console.log(await file.text());
}
```

### Memory driver (testing)

```ts
import { createDisk } from "@minimajs/disk";
import { createMemoryDriver } from "@minimajs/disk/adapters";

const driver = createMemoryDriver();
const disk = createDisk({ driver });

await disk.put("test.txt", "test content");
const file = await disk.get("test.txt");
```

### Upload a Web `File` directly

`disk.put(file)` is supported. The file name and MIME type are automatically taken from the `File`.

```ts
const stored = await disk.put(new File(["hey there"], "greeting.txt", { type: "text/plain" }));

console.log(stored.name); // greeting.txt
console.log(stored.type); // text/plain
```

### AWS S3 driver

```ts
import { createDisk } from "@minimajs/disk";
import { createS3Driver } from "@minimajs/aws-s3";

const disk = createDisk({
  driver: createS3Driver({
    bucket: "my-bucket",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

await disk.put("uploads/avatar.jpg", imageBuffer);
```

### Protocol routing with `createProtoDisk`

```ts
import { createProtoDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";
import { createS3Driver } from "@minimajs/aws-s3";

const disk = createProtoDisk({
  protocols: {
    "file://": createFsDriver({ root: "file:///var/data/" }),
    "s3://assets/": createS3Driver({ bucket: "assets", region: "us-east-1" }),
  },
  defaultProtocol: "file://",
});

await disk.put("file://logs/app.log", "ok");
await disk.put("s3://assets/logo.png", imageBuffer);
```

## API at a glance

Core operations:

- `put(path, data, options?) => Promise<DiskFile>`
- `put(file, options?) => Promise<DiskFile>`
- `get(path) => Promise<DiskFile | null>`
- `exists(path) => Promise<boolean>`
- `delete(path | file) => Promise<string>`
- `copy(from, to?) => Promise<DiskFile>`
- `move(from, to?) => Promise<DiskFile>`
- `url(path, options?) => Promise<string>`
- `metadata(path) => Promise<FileMetadata | null>`
- `list(prefix?, options?) => AsyncIterable<DiskFile>`

Example listing:

```ts
for await (const file of disk.list("uploads/")) {
  console.log(file.href, file.size);
}
```

## `DiskFile`

`get()`, `put()`, `copy()`, and `move()` return `DiskFile`, which extends the Web `File` API.

```ts
const file = await disk.get("document.pdf");
if (!file) return;

file.name;
file.size;
file.type;
file.lastModified;
file.href; // storage identifier (for example: s3://bucket/path/file.pdf)
file.metadata;

await file.text();
await file.arrayBuffer();
file.stream();
```

## Adapters and plugins

- Built-in adapters: `@minimajs/disk/adapters` (`createFsDriver`, `createMemoryDriver`)
- Cloud adapters: `@minimajs/aws-s3`, `@minimajs/azure-blob`
- Plugins: `@minimajs/disk/plugins`

```ts
import { createDisk } from "@minimajs/disk";
import { createFsDriver } from "@minimajs/disk/adapters";
import { storeAs, atomicWrite } from "@minimajs/disk/plugins";

const disk = createDisk(
  { driver: createFsDriver({ root: "file:///var/uploads/" }) },
  storeAs("uuid-original"),
  atomicWrite()
);
```

## Documentation

- https://minimajs.com/packages/disk/

## License

MIT
