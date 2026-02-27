import { describe, test, jest } from "@jest/globals";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { S3Driver } from "../s3-driver.js";
import { createS3Driver } from "../index.js";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function textToNodeReadable(text: string): Readable {
  return Readable.from([Buffer.from(text)]);
}

interface MockS3Responses {
  head?: Record<string, any> | Error;
  get?: Record<string, any> | Error | null;
  list?: Record<string, any>;
  copy?: Record<string, any> | Error;
  delete?: Record<string, any> | Error;
}

function createMockS3Client(responses: MockS3Responses = {}) {
  const {
    head = {
      ContentLength: 11,
      ContentType: "text/plain",
      LastModified: new Date(1_000_000),
      Metadata: { userId: "42" },
    },
    get = {
      Body: textToNodeReadable("hello world"),
      ContentLength: 11,
      ContentType: "text/plain",
      LastModified: new Date(1_000_000),
      Metadata: { userId: "42" },
    },
    list = { Contents: [], NextContinuationToken: undefined },
    copy = {},
    delete: del = {},
  } = responses;

  const sendFn = jest.fn(async (command: any) => {
    if (command instanceof HeadObjectCommand) {
      if (head instanceof Error) throw head;
      return head;
    }
    if (command instanceof GetObjectCommand) {
      if (get instanceof Error) throw get;
      if (get === null) {
        const err: any = new Error("NoSuchKey");
        err.name = "NoSuchKey";
        throw err;
      }
      return get;
    }
    if (command instanceof ListObjectsV2Command) {
      return list;
    }
    if (command instanceof CopyObjectCommand) {
      if (copy instanceof Error) throw copy;
      return copy;
    }
    if (command instanceof DeleteObjectCommand) {
      if (del instanceof Error) throw del;
      return del;
    }
    // Catch-all: satisfies Upload internals (PutObjectCommand etc.)
    return {};
  });

  const client = {
    send: sendFn,
    config: {
      region: jest.fn(async () => "us-east-1"),
      endpoint: undefined,
      forcePathStyle: false,
    },
  } as unknown as S3Client;

  return { client, sendFn };
}

// ---------------------------------------------------------------------------
// hrefToKey — href parsing (exercised via public methods)
// ---------------------------------------------------------------------------

describe("S3Driver — href parsing", () => {
  test("parses s3://bucket/key href", async () => {
    const { client, sendFn } = createMockS3Client();
    const driver = new S3Driver(client, {});

    await driver.exists("s3://my-bucket/uploads/photo.jpg");

    const cmd: any = sendFn.mock.calls[0]![0];
    assert.ok(cmd instanceof HeadObjectCommand);
    assert.equal(cmd.input.Bucket, "my-bucket");
    assert.equal(cmd.input.Key, "uploads/photo.jpg");
  });

  test("uses bucket from constructor when href is a plain key", async () => {
    const { client, sendFn } = createMockS3Client();
    const driver = new S3Driver(client, { bucket: "default-bucket" });

    await driver.exists("some/key.txt");

    const cmd: any = sendFn.mock.calls[0]![0];
    assert.equal(cmd.input.Bucket, "default-bucket");
    assert.equal(cmd.input.Key, "some/key.txt");
  });

  test("resolves publicUrl href back to s3 key", async () => {
    const { client, sendFn } = createMockS3Client();
    const driver = new S3Driver(client, {
      bucket: "my-bucket",
      publicUrl: "https://cdn.example.com",
    });

    await driver.exists("https://cdn.example.com/images/photo.jpg");

    const cmd: any = sendFn.mock.calls[0]![0];
    assert.equal(cmd.input.Bucket, "my-bucket");
    assert.equal(cmd.input.Key, "images/photo.jpg");
  });

  test("applies prefix to plain key hrefs", async () => {
    const { client, sendFn } = createMockS3Client();
    const driver = new S3Driver(client, { bucket: "my-bucket", prefix: "prod" });

    await driver.exists("file.txt");

    const cmd: any = sendFn.mock.calls[0]![0];
    assert.equal(cmd.input.Key, "prod/file.txt");
  });

  test("throws when no bucket is configured and href is a plain key", async () => {
    const { client } = createMockS3Client();
    const driver = new S3Driver(client, {});

    await assert.rejects(() => driver.exists("plain-key.txt"), /Bucket must be specified/);
  });

  test("throws for empty S3 key in s3:// href", async () => {
    const { client } = createMockS3Client();
    const driver = new S3Driver(client, {});

    await assert.rejects(() => driver.exists("s3://bucket/"), /S3 key cannot be empty/);
  });
});

// ---------------------------------------------------------------------------
// put
// ---------------------------------------------------------------------------

describe("S3Driver — put", () => {
  test("returns FileMetadata built from HeadObject after upload", async () => {
    const { client } = createMockS3Client({
      head: {
        ContentLength: 13,
        ContentType: "text/plain",
        LastModified: new Date(2_000_000),
        Metadata: { custom: "value" },
      },
    });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode("hello from put"));
        ctrl.close();
      },
    });

    const metadata = await driver.put("s3://my-bucket/file.txt", stream, { type: "text/plain" });

    assert.equal(metadata.href, "s3://my-bucket/file.txt");
    assert.equal(metadata.size, 13);
    assert.equal(metadata.type, "text/plain");
    assert.deepEqual(metadata.metadata, { custom: "value" });
  });

  test("HeadObjectCommand is called after upload to fetch metadata", async () => {
    const { client, sendFn } = createMockS3Client();
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode("data"));
        ctrl.close();
      },
    });

    await driver.put("s3://my-bucket/file.txt", stream, { type: "text/plain" });

    const headCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof HeadObjectCommand);
    assert.ok(headCall, "HeadObjectCommand should be called after upload");
  });

  test("includes custom metadata in upload params", async () => {
    const { client } = createMockS3Client();
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode("x"));
        ctrl.close();
      },
    });

    const result = await driver.put("s3://my-bucket/doc.txt", stream, {
      type: "text/plain",
      metadata: { source: "upload" },
    });

    assert.ok(result.href.includes("doc.txt"));
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe("S3Driver — get", () => {
  test("returns stream and metadata for an existing object", async () => {
    const { client } = createMockS3Client({
      get: {
        Body: textToNodeReadable("stored content"),
        ContentLength: 14,
        ContentType: "text/plain",
        LastModified: new Date(3_000_000),
        Metadata: {},
      },
    });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    const result = await driver.get("s3://my-bucket/file.txt");

    assert.ok(result);
    const [stream, meta] = result;
    assert.ok(stream instanceof ReadableStream);
    assert.equal(meta.href, "s3://my-bucket/file.txt");
    assert.equal(meta.size, 14);
  });

  test("returns null for NoSuchKey error", async () => {
    const err: any = new Error("The specified key does not exist");
    err.name = "NoSuchKey";

    const { client } = createMockS3Client({ get: err });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    assert.equal(await driver.get("s3://my-bucket/missing.txt"), null);
  });

  test("returns null for 404 HTTP status", async () => {
    const err: any = new Error("Not Found");
    err.$metadata = { httpStatusCode: 404 };

    const { client } = createMockS3Client({ get: err });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    assert.equal(await driver.get("s3://my-bucket/missing.txt"), null);
  });

  test("rethrows non-404 errors", async () => {
    const err: any = new Error("InternalError");
    err.name = "InternalError";

    const { client } = createMockS3Client({ get: err });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    await assert.rejects(() => driver.get("s3://my-bucket/file.txt"), { message: "InternalError" });
  });
});

// ---------------------------------------------------------------------------
// exists
// ---------------------------------------------------------------------------

describe("S3Driver — exists", () => {
  test("returns true when HeadObject succeeds", async () => {
    const { client } = createMockS3Client();
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    assert.equal(await driver.exists("s3://my-bucket/file.txt"), true);
  });

  test("returns false for NotFound error", async () => {
    const err: any = new Error("Not Found");
    err.name = "NotFound";

    const { client } = createMockS3Client({ head: err });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    assert.equal(await driver.exists("s3://my-bucket/missing.txt"), false);
  });

  test("returns false for 404 HTTP status", async () => {
    const err: any = new Error("Not Found");
    err.$metadata = { httpStatusCode: 404 };

    const { client } = createMockS3Client({ head: err });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    assert.equal(await driver.exists("s3://my-bucket/missing.txt"), false);
  });

  test("rethrows non-404 errors from HeadObject", async () => {
    const err: any = new Error("AccessDenied");
    err.name = "AccessDenied";

    const { client } = createMockS3Client({ head: err });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    await assert.rejects(() => driver.exists("s3://my-bucket/file.txt"), { message: "AccessDenied" });
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("S3Driver — delete", () => {
  test("sends DeleteObjectCommand with correct bucket and key", async () => {
    const { client, sendFn } = createMockS3Client();
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    await driver.delete("s3://my-bucket/file.txt");

    const deleteCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof DeleteObjectCommand);
    assert.ok(deleteCall);
    const cmd: any = deleteCall[0];
    assert.equal(cmd.input.Bucket, "my-bucket");
    assert.equal(cmd.input.Key, "file.txt");
  });
});

// ---------------------------------------------------------------------------
// copy
// ---------------------------------------------------------------------------

describe("S3Driver — copy", () => {
  test("sends CopyObjectCommand with correct source and destination", async () => {
    const { client, sendFn } = createMockS3Client();
    const driver = new S3Driver(client, {});

    await driver.copy("s3://bucket-a/source.txt", "s3://bucket-b/dest.txt");

    const copyCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof CopyObjectCommand);
    assert.ok(copyCall);
    const cmd: any = copyCall[0];
    assert.equal(cmd.input.Bucket, "bucket-b");
    assert.equal(cmd.input.Key, "dest.txt");
    assert.equal(cmd.input.CopySource, "bucket-a/source.txt");
  });

  test("can copy within the same bucket", async () => {
    const { client, sendFn } = createMockS3Client();
    const driver = new S3Driver(client, { bucket: "same-bucket" });

    await driver.copy("s3://same-bucket/original.txt", "s3://same-bucket/copy.txt");

    const copyCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof CopyObjectCommand);
    assert.ok(copyCall);
  });
});

// ---------------------------------------------------------------------------
// move
// ---------------------------------------------------------------------------

describe("S3Driver — move", () => {
  test("calls copy then delete", async () => {
    const { client, sendFn } = createMockS3Client();
    const driver = new S3Driver(client, {});

    await driver.move("s3://bucket/source.txt", "s3://bucket/dest.txt");

    const copyCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof CopyObjectCommand);
    const deleteCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof DeleteObjectCommand);

    assert.ok(copyCall, "should copy");
    assert.ok(deleteCall, "should delete source");

    const deleteCmd: any = deleteCall[0];
    assert.equal(deleteCmd.input.Key, "source.txt");
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe("S3Driver — list", () => {
  test("yields FileMetadata for each listed object", async () => {
    const { client } = createMockS3Client({
      list: {
        Contents: [
          { Key: "uploads/a.jpg", Size: 100, LastModified: new Date(1000) },
          { Key: "uploads/b.jpg", Size: 200, LastModified: new Date(2000) },
        ],
        NextContinuationToken: undefined,
      },
    });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    const files: any[] = [];
    for await (const file of driver.list("s3://my-bucket/uploads/", {})) {
      files.push(file);
    }

    assert.equal(files.length, 2);
    assert.equal(files[0]!.href, "s3://my-bucket/uploads/a.jpg");
    assert.equal(files[0]!.size, 100);
    assert.equal(files[1]!.href, "s3://my-bucket/uploads/b.jpg");
  });

  test("respects limit option via MaxKeys", async () => {
    const { client, sendFn } = createMockS3Client({
      list: {
        Contents: [
          { Key: "a.txt", Size: 1, LastModified: new Date() },
          { Key: "b.txt", Size: 2, LastModified: new Date() },
          { Key: "c.txt", Size: 3, LastModified: new Date() },
        ],
      },
    });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    const files: any[] = [];
    for await (const file of driver.list("s3://my-bucket/", { limit: 2 })) {
      files.push(file);
    }

    assert.equal(files.length, 2);
    const listCmd: any = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof ListObjectsV2Command)?.[0];
    assert.ok(listCmd);
    assert.equal(listCmd.input.MaxKeys, 2);
  });

  test("paginates using ContinuationToken", async () => {
    let callCount = 0;
    const pageSend = jest.fn(async (command: any) => {
      if (command instanceof ListObjectsV2Command) {
        callCount++;
        if (callCount === 1) {
          return {
            Contents: [{ Key: "a.txt", Size: 1, LastModified: new Date() }],
            NextContinuationToken: "token-123",
          };
        }
        return {
          Contents: [{ Key: "b.txt", Size: 2, LastModified: new Date() }],
          NextContinuationToken: undefined,
        };
      }
      return {};
    });

    const paginatedClient = {
      send: pageSend,
      config: { region: jest.fn(async () => "us-east-1"), endpoint: undefined, forcePathStyle: false },
    } as unknown as S3Client;

    const driver = new S3Driver(paginatedClient, { bucket: "my-bucket" });

    const files: any[] = [];
    for await (const file of driver.list("s3://my-bucket/", {})) {
      files.push(file);
    }

    assert.equal(files.length, 2);
    assert.equal(callCount, 2);
    const secondListCmd: any = pageSend.mock.calls[1]![0];
    assert.equal(secondListCmd.input.ContinuationToken, "token-123");
  });

  test("throws when no bucket is given and none in config", async () => {
    const { client } = createMockS3Client();
    const driver = new S3Driver(client, {});

    await assert.rejects(async () => {
      for await (const _ of driver.list("", {})) {
        // iterate
      }
    }, /Bucket must be specified/);
  });
});

// ---------------------------------------------------------------------------
// metadata
// ---------------------------------------------------------------------------

describe("S3Driver — metadata", () => {
  test("returns FileMetadata from HeadObject", async () => {
    const { client } = createMockS3Client({
      head: {
        ContentLength: 42,
        ContentType: "application/json",
        LastModified: new Date(5_000_000),
        Metadata: { env: "prod" },
      },
    });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    const meta = await driver.metadata("s3://my-bucket/data.json");

    assert.ok(meta);
    assert.equal(meta.href, "s3://my-bucket/data.json");
    assert.equal(meta.size, 42);
    assert.equal(meta.type, "application/json");
    assert.deepEqual(meta.metadata, { env: "prod" });
  });

  test("returns null for NotFound error", async () => {
    const err: any = new Error("Not Found");
    err.name = "NotFound";

    const { client } = createMockS3Client({ head: err });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    assert.equal(await driver.metadata("s3://my-bucket/missing.json"), null);
  });

  test("returns null for 404 HTTP status", async () => {
    const err: any = new Error("Not Found");
    err.$metadata = { httpStatusCode: 404 };

    const { client } = createMockS3Client({ head: err });
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    assert.equal(await driver.metadata("s3://my-bucket/missing.json"), null);
  });
});

// ---------------------------------------------------------------------------
// url
// ---------------------------------------------------------------------------

describe("S3Driver — url", () => {
  test("returns publicUrl + key when publicUrl is configured", async () => {
    const { client } = createMockS3Client();
    const driver = new S3Driver(client, {
      bucket: "my-bucket",
      publicUrl: "https://cdn.example.com",
    });

    const url = await driver.url("s3://my-bucket/images/photo.jpg");
    assert.equal(url, "https://cdn.example.com/images/photo.jpg");
  });

  test("returns standard S3 URL when no publicUrl", async () => {
    const { client } = createMockS3Client();
    const driver = new S3Driver(client, { bucket: "my-bucket" });

    const url = await driver.url("s3://my-bucket/file.txt");
    assert.match(url, /^https:\/\/my-bucket\.s3\.us-east-1\.amazonaws\.com\/file\.txt$/);
  });

  test("generates path-style URL when forcePathStyle is true", async () => {
    const client = {
      send: jest.fn(async () => ({})),
      config: {
        region: jest.fn(async () => "us-east-1"),
        endpoint: undefined,
        forcePathStyle: true,
      },
    } as unknown as S3Client;

    const driver = new S3Driver(client, { bucket: "my-bucket" });
    const url = await driver.url("s3://my-bucket/file.txt");
    assert.match(url, /^https:\/\/s3\.us-east-1\.amazonaws\.com\/my-bucket\/file\.txt$/);
  });

  test("generates custom endpoint URL with path-style", async () => {
    const client = {
      send: jest.fn(async () => ({})),
      config: {
        region: jest.fn(async () => "us-east-1"),
        endpoint: jest.fn(async () => ({ protocol: "http:", hostname: "localhost", port: 9000 })),
        forcePathStyle: true,
      },
    } as unknown as S3Client;

    const driver = new S3Driver(client, { bucket: "my-bucket" });
    const url = await driver.url("s3://my-bucket/file.txt");
    assert.equal(url, "http://localhost:9000/my-bucket/file.txt");
  });
});

// ---------------------------------------------------------------------------
// getPartitionSuffix via url()
// ---------------------------------------------------------------------------

describe("S3Driver — AWS partition suffix", () => {
  const cases: [string, string][] = [
    ["cn-northwest-1", "amazonaws.com.cn"],
    ["us-iso-east-1", "c2s.ic.gov"],
    ["us-isob-east-1", "sc2s.sgov.gov"],
    ["us-east-1", "amazonaws.com"],
    ["eu-west-1", "amazonaws.com"],
  ];

  for (const [region, expectedDomain] of cases) {
    test(`region ${region} → ${expectedDomain}`, async () => {
      const client = {
        send: jest.fn(async () => ({})),
        config: {
          region: jest.fn(async () => region),
          endpoint: undefined,
          forcePathStyle: false,
        },
      } as unknown as S3Client;

      const driver = new S3Driver(client, { bucket: "my-bucket" });
      const url = await driver.url("s3://my-bucket/file.txt");
      assert.ok(url.includes(expectedDomain), `expected ${expectedDomain} in ${url}`);
    });
  }
});

// ---------------------------------------------------------------------------
// createS3Driver factory
// ---------------------------------------------------------------------------

describe("createS3Driver factory", () => {
  test("accepts combined options object", () => {
    const driver = createS3Driver({
      bucket: "test-bucket",
      region: "us-west-2",
      credentials: {
        accessKeyId: "fake-key",
        secretAccessKey: "fake-secret",
      },
    });
    assert.ok(driver);
  });

  test("accepts an S3Client instance + options", () => {
    const client = new S3Client({ region: "us-east-1" });
    const driver = createS3Driver(client, { bucket: "test-bucket" });
    assert.ok(driver);
  });
});
