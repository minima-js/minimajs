import { describe, test, jest, expect } from "@jest/globals";
import {
  HeadObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { S3Driver } from "../s3-driver.js";
import { createS3Driver } from "../index.js";
import { setup, textToNodeReadable } from "./helpers.js";
import { text2stream } from "@minimajs/disk/helpers";

// ---------------------------------------------------------------------------
// href parsing
// ---------------------------------------------------------------------------

describe("S3Driver — href parsing", () => {
  test("parses s3://bucket/key href", async () => {
    const { driver, sendFn } = setup();

    await driver.exists("s3://my-bucket/uploads/photo.jpg", {});

    const cmd: any = sendFn.mock.calls[0]![0];
    expect(cmd).toBeInstanceOf(HeadObjectCommand);
    expect(cmd.input.Bucket).toBe("my-bucket");
    expect(cmd.input.Key).toBe("uploads/photo.jpg");
  });

  test("uses bucket from constructor when href is a plain key", async () => {
    const { driver, sendFn } = setup({ bucket: "default-bucket" });

    await driver.exists("some/key.txt", {});

    const cmd: any = sendFn.mock.calls[0]![0];
    expect(cmd.input.Bucket).toBe("default-bucket");
    expect(cmd.input.Key).toBe("some/key.txt");
  });

  test("resolves publicUrl href back to s3 key", async () => {
    const { driver, sendFn } = setup({ bucket: "my-bucket", publicUrl: "https://cdn.example.com" });

    await driver.exists("https://cdn.example.com/images/photo.jpg", {});

    const cmd: any = sendFn.mock.calls[0]![0];
    expect(cmd.input.Bucket).toBe("my-bucket");
    expect(cmd.input.Key).toBe("images/photo.jpg");
  });

  test("applies prefix to plain key hrefs", async () => {
    const { driver, sendFn } = setup({ bucket: "my-bucket", prefix: "prod" });

    await driver.exists("file.txt", {});

    const cmd: any = sendFn.mock.calls[0]![0];
    expect(cmd.input.Key).toBe("prod/file.txt");
  });

  test("throws when no bucket is configured and href is a plain key", async () => {
    const { driver } = setup({});
    await expect(driver.exists("plain-key.txt", {})).rejects.toThrow(/Bucket must be specified/);
  });

  test("throws for empty S3 key in s3:// href", async () => {
    const { driver } = setup({});
    await expect(driver.exists("s3://bucket/", {})).rejects.toThrow(/Invalid S3/);
  });
});

// ---------------------------------------------------------------------------
// put
// ---------------------------------------------------------------------------

describe("S3Driver — put", () => {
  test("returns FileMetadata built from HeadObject after upload", async () => {
    const { driver } = setup(
      { bucket: "my-bucket" },
      {
        head: {
          ContentLength: 13,
          ContentType: "text/plain",
          LastModified: new Date(2_000_000),
          Metadata: { custom: "value" },
        },
      }
    );

    const metadata = await driver.put("s3://my-bucket/file.txt", text2stream("hello from put"), {
      type: "text/plain",
    });

    expect(metadata.href).toBe("s3://my-bucket/file.txt");
    expect(metadata.size).toBe(13);
    expect(metadata.type).toBe("text/plain");
    expect(metadata.metadata).toEqual({ custom: "value" });
  });

  test("HeadObjectCommand is called after upload to fetch metadata", async () => {
    const { driver, sendFn } = setup();

    await driver.put("s3://my-bucket/file.txt", text2stream("data"), { type: "text/plain" });

    const headCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof HeadObjectCommand);
    expect(headCall).toBeDefined();
  });

  test("includes custom metadata in upload params", async () => {
    const { driver } = setup();

    const result = await driver.put("s3://my-bucket/doc.txt", text2stream("x"), {
      type: "text/plain",
      metadata: { source: "upload" },
    });

    expect(result.href).toContain("doc.txt");
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe("S3Driver — get", () => {
  test("returns stream and metadata for an existing object", async () => {
    const { driver } = setup(
      { bucket: "my-bucket" },
      {
        get: {
          Body: textToNodeReadable("stored content"),
          ContentLength: 14,
          ContentType: "text/plain",
          LastModified: new Date(3_000_000),
          Metadata: {},
        },
      }
    );

    const result = await driver.get("s3://my-bucket/file.txt", {});

    expect(result).not.toBeNull();
    const [stream, meta] = result!;
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(meta.href).toBe("s3://my-bucket/file.txt");
    expect(meta.size).toBe(14);
  });

  test("returns null for NoSuchKey error", async () => {
    const err: any = new Error("The specified key does not exist");
    err.name = "NoSuchKey";

    const { driver } = setup({ bucket: "my-bucket" }, { get: err });
    expect(await driver.get("s3://my-bucket/missing.txt", {})).toBeNull();
  });

  test("returns null for 404 HTTP status", async () => {
    const err: any = new Error("Not Found");
    err.$metadata = { httpStatusCode: 404 };

    const { driver } = setup({ bucket: "my-bucket" }, { get: err });
    expect(await driver.get("s3://my-bucket/missing.txt", {})).toBeNull();
  });

  test("rethrows non-404 errors", async () => {
    const err: any = new Error("InternalError");
    err.name = "InternalError";

    const { driver } = setup({ bucket: "my-bucket" }, { get: err });
    await expect(driver.get("s3://my-bucket/file.txt", {})).rejects.toThrow("InternalError");
  });
});

// ---------------------------------------------------------------------------
// exists
// ---------------------------------------------------------------------------

describe("S3Driver — exists", () => {
  test("returns true when HeadObject succeeds", async () => {
    const { driver } = setup();
    expect(await driver.exists("s3://my-bucket/file.txt", {})).toBe(true);
  });

  test("returns false for NotFound error", async () => {
    const err: any = new Error("Not Found");
    err.name = "NotFound";

    const { driver } = setup({ bucket: "my-bucket" }, { head: err });
    expect(await driver.exists("s3://my-bucket/missing.txt", {})).toBe(false);
  });

  test("returns false for 404 HTTP status", async () => {
    const err: any = new Error("Not Found");
    err.$metadata = { httpStatusCode: 404 };

    const { driver } = setup({ bucket: "my-bucket" }, { head: err });
    expect(await driver.exists("s3://my-bucket/missing.txt", {})).toBe(false);
  });

  test("rethrows non-404 errors from HeadObject", async () => {
    const err: any = new Error("AccessDenied");
    err.name = "AccessDenied";

    const { driver } = setup({ bucket: "my-bucket" }, { head: err });
    await expect(driver.exists("s3://my-bucket/file.txt", {})).rejects.toThrow("AccessDenied");
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("S3Driver — delete", () => {
  test("sends DeleteObjectCommand with correct bucket and key", async () => {
    const { driver, sendFn } = setup();

    await driver.delete("s3://my-bucket/file.txt", {});

    const deleteCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof DeleteObjectCommand);
    expect(deleteCall).toBeDefined();
    const cmd: any = deleteCall![0];
    expect(cmd.input.Bucket).toBe("my-bucket");
    expect(cmd.input.Key).toBe("file.txt");
  });
});

// ---------------------------------------------------------------------------
// copy
// ---------------------------------------------------------------------------

describe("S3Driver — copy", () => {
  test("sends CopyObjectCommand with correct source and destination", async () => {
    const { driver, sendFn } = setup({});

    await driver.copy("s3://bucket-a/source.txt", "s3://bucket-b/dest.txt", {});

    const copyCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof CopyObjectCommand);
    expect(copyCall).toBeDefined();
    const cmd: any = copyCall![0];
    expect(cmd.input.Bucket).toBe("bucket-b");
    expect(cmd.input.Key).toBe("dest.txt");
    expect(cmd.input.CopySource).toBe("bucket-a/source.txt");
  });

  test("can copy within the same bucket", async () => {
    const { driver, sendFn } = setup({ bucket: "same-bucket" });

    await driver.copy("s3://same-bucket/original.txt", "s3://same-bucket/copy.txt", {});

    const copyCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof CopyObjectCommand);
    expect(copyCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// move
// ---------------------------------------------------------------------------

describe("S3Driver — move", () => {
  test("calls copy then delete", async () => {
    const { driver, sendFn } = setup({});

    await driver.move("s3://bucket/source.txt", "s3://bucket/dest.txt", {});

    const copyCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof CopyObjectCommand);
    const deleteCall = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof DeleteObjectCommand);

    expect(copyCall).toBeDefined();
    expect(deleteCall).toBeDefined();

    const deleteCmd: any = deleteCall![0];
    expect(deleteCmd.input.Key).toBe("source.txt");
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe("S3Driver — list", () => {
  test("yields FileMetadata for each listed object", async () => {
    const { driver } = setup(
      { bucket: "my-bucket" },
      {
        list: {
          Contents: [
            { Key: "uploads/a.jpg", Size: 100, LastModified: new Date(1000) },
            { Key: "uploads/b.jpg", Size: 200, LastModified: new Date(2000) },
          ],
          NextContinuationToken: undefined,
        },
      }
    );

    const files: any[] = [];
    for await (const file of driver.list("s3://my-bucket/uploads/", {})) {
      files.push(file);
    }

    expect(files.length).toBe(2);
    expect(files[0]!.href).toBe("s3://my-bucket/uploads/a.jpg");
    expect(files[0]!.size).toBe(100);
    expect(files[1]!.href).toBe("s3://my-bucket/uploads/b.jpg");
  });

  test("respects limit option via MaxKeys", async () => {
    const { driver, sendFn } = setup(
      { bucket: "my-bucket" },
      {
        list: {
          Contents: [
            { Key: "a.txt", Size: 1, LastModified: new Date() },
            { Key: "b.txt", Size: 2, LastModified: new Date() },
            { Key: "c.txt", Size: 3, LastModified: new Date() },
          ],
        },
      }
    );

    const files: any[] = [];
    for await (const file of driver.list("s3://my-bucket/", { limit: 2 })) {
      files.push(file);
    }

    expect(files.length).toBe(2);
    const listCmd: any = sendFn.mock.calls.find(([cmd]: any[]) => cmd instanceof ListObjectsV2Command)?.[0];
    expect(listCmd).toBeDefined();
    expect(listCmd.input.MaxKeys).toBe(2);
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

    expect(files.length).toBe(2);
    expect(callCount).toBe(2);
    const secondListCmd: any = pageSend.mock.calls[1]![0];
    expect(secondListCmd.input.ContinuationToken).toBe("token-123");
  });

  test("throws when no bucket is given and none in config", async () => {
    const { driver } = setup({});

    await expect(
      (async () => {
        for await (const _ of driver.list("", {})) {
          // iterate
        }
      })()
    ).rejects.toThrow(/Bucket must be specified/);
  });
});

// ---------------------------------------------------------------------------
// metadata
// ---------------------------------------------------------------------------

describe("S3Driver — metadata", () => {
  test("returns FileMetadata from HeadObject", async () => {
    const { driver } = setup(
      { bucket: "my-bucket" },
      {
        head: {
          ContentLength: 42,
          ContentType: "application/json",
          LastModified: new Date(5_000_000),
          Metadata: { env: "prod" },
        },
      }
    );

    const meta = await driver.metadata("s3://my-bucket/data.json", {});

    expect(meta).not.toBeNull();
    expect(meta!.href).toBe("s3://my-bucket/data.json");
    expect(meta!.size).toBe(42);
    expect(meta!.type).toBe("application/json");
    expect(meta!.metadata).toEqual({ env: "prod" });
  });

  test("returns null for NotFound error", async () => {
    const err: any = new Error("Not Found");
    err.name = "NotFound";

    const { driver } = setup({ bucket: "my-bucket" }, { head: err });
    expect(await driver.metadata("s3://my-bucket/missing.json", {})).toBeNull();
  });

  test("returns null for 404 HTTP status", async () => {
    const err: any = new Error("Not Found");
    err.$metadata = { httpStatusCode: 404 };

    const { driver } = setup({ bucket: "my-bucket" }, { head: err });
    expect(await driver.metadata("s3://my-bucket/missing.json", {})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// url
// ---------------------------------------------------------------------------

describe("S3Driver — url", () => {
  test("returns publicUrl + key when publicUrl is configured", async () => {
    const { driver } = setup({ bucket: "my-bucket", publicUrl: "https://cdn.example.com" });
    const url = await driver.url("s3://my-bucket/images/photo.jpg");
    expect(url).toBe("https://cdn.example.com/images/photo.jpg");
  });

  test("returns standard S3 URL when no publicUrl", async () => {
    const { driver } = setup();
    const url = await driver.url("s3://my-bucket/file.txt");
    expect(url).toMatch(/^https:\/\/my-bucket\.s3\.us-east-1\.amazonaws\.com\/file\.txt$/);
  });

  test("generates path-style URL when forcePathStyle is true", async () => {
    const { driver } = setup({}, {}, { forcePathStyle: true });
    const url = await driver.url("s3://my-bucket/file.txt");
    expect(url).toMatch(/^https:\/\/s3\.us-east-1\.amazonaws\.com\/my-bucket\/file\.txt$/);
  });

  test("generates custom endpoint URL with path-style", async () => {
    const { driver } = setup(
      {},
      {},
      {
        forcePathStyle: true,
        endpoint: jest.fn(async () => ({ protocol: "http:", hostname: "localhost", port: 9000 })),
      }
    );
    const url = await driver.url("s3://my-bucket/file.txt");
    expect(url).toBe("http://localhost:9000/my-bucket/file.txt");
  });
});

// ---------------------------------------------------------------------------
// AWS partition suffix
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
      const { driver } = setup({}, {}, { region });
      const url = await driver.url("s3://my-bucket/file.txt");
      expect(url).toContain(expectedDomain);
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
    expect(driver).toBeDefined();
  });

  test("accepts an S3Client instance + options", () => {
    const client = new S3Client({ region: "us-east-1" });
    const driver = createS3Driver(client, { bucket: "test-bucket" });
    expect(driver).toBeDefined();
  });
});
