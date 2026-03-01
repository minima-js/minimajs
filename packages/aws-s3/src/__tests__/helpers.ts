import { jest } from "@jest/globals";
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

export type MockFn = ((...args: any[]) => any) & { mock: { calls: any[][] } };

export function textToNodeReadable(text: string): Readable {
  return Readable.from([Buffer.from(text)]);
}

export interface MockS3Responses {
  head?: Record<string, any> | Error;
  get?: Record<string, any> | Error | null;
  list?: Record<string, any>;
  copy?: Record<string, any> | Error;
  delete?: Record<string, any> | Error;
}

export interface MockS3Config {
  region?: string;
  endpoint?: MockFn;
  forcePathStyle?: boolean;
}

export interface MockS3Client {
  client: S3Client;
  sendFn: MockFn;
}

export function createMockS3Client(responses: MockS3Responses = {}, config: MockS3Config = {}): MockS3Client {
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

  const sendFn: MockFn = jest.fn(async (command: any) => {
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
    if (command instanceof ListObjectsV2Command) return list;
    if (command instanceof CopyObjectCommand) {
      if (copy instanceof Error) throw copy;
      return copy;
    }
    if (command instanceof DeleteObjectCommand) {
      if (del instanceof Error) throw del;
      return del;
    }
    // Support @aws-sdk/lib-storage multipart upload internals
    if (command.constructor.name === "CreateMultipartUploadCommand") return { UploadId: "mock-upload-id" };
    if (command.constructor.name === "UploadPartCommand") return { ETag: "mock-etag" };
    if (command.constructor.name === "CompleteMultipartUploadCommand") return { Location: "mock", ETag: "mock-etag" };
    return {};
  });

  const client = {
    send: sendFn,
    config: {
      region: jest.fn(async () => config.region ?? "us-east-1"),
      endpointProvider: jest.fn(async () => ({
        protocol: "https:",
        hostname: "s3.us-east-1.amazonaws.com",
        path: "/",
      })),
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? false,
    },
  } as unknown as S3Client;

  return { client, sendFn };
}

export interface SetupResult {
  client: S3Client;
  sendFn: MockFn;
  driver: S3Driver;
}

/** One-liner test setup: driver options + optional mock responses/config */
export function setup(
  driverOptions: Record<string, any> = { bucket: "my-bucket" },
  responses: MockS3Responses = {},
  config: MockS3Config = {}
): SetupResult {
  const { client, sendFn } = createMockS3Client(responses, config);
  const driver = new S3Driver(client, driverOptions);
  return { client, sendFn, driver };
}
