import { describe, test, expect } from "@jest/globals";
import { Readable } from "node:stream";
import { StreamFile } from "./file.js";

describe("StreamFile", () => {
  function createStreamFile(content: string | Buffer = "test content") {
    const buffer = typeof content === "string" ? Buffer.from(content) : content;
    return new StreamFile("test.txt", {
      stream: Readable.from([buffer]),
      type: "text/plain",
      lastModified: Date.now(),
    });
  }

  test("should store filename and type correctly", () => {
    const file = createStreamFile();

    expect(file.name).toBe("test.txt");
    expect(file.type).toContain("text/plain");
  });

  test("size should return Infinity before buffering", () => {
    const file = createStreamFile();

    expect(file.size).toBe(Infinity);
  });

  test("size should return actual size after buffering", async () => {
    const content = "Hello, World!";
    const file = createStreamFile(content);

    await file.bytes();

    expect(file.size).toBe(content.length);
  });

  test("stream() should return ReadableStream", () => {
    const file = createStreamFile();

    const stream = file.stream();

    expect(stream).toBeInstanceOf(ReadableStream);
  });

  test("stream() should throw if already consumed", async () => {
    const file = createStreamFile();

    await file.bytes(); // Consume the stream

    expect(() => file.stream()).toThrow("stream already consumed");
  });

  test("arrayBuffer() should return ArrayBuffer", async () => {
    const content = "Hello, World!";
    const file = createStreamFile(content);

    const buffer = await file.arrayBuffer();

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(await file.text()).toBe(content);
  });

  test("text() should return string content", async () => {
    const content = "Hello, World!";
    const file = createStreamFile(content);

    const text = await file.text();

    expect(text).toBe(content);
  });

  test("bytes() should return Uint8Array", async () => {
    const content = "Hello, World!";
    const file = createStreamFile(content);

    const bytes = await file.bytes();

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(bytes).toString()).toBe(content);
  });

  test("bytes() should cache result on subsequent calls", async () => {
    const file = createStreamFile("content");

    const bytes1 = await file.bytes();
    const bytes2 = await file.bytes();

    expect(bytes1).toBe(bytes2); // Same reference
  });

  test("slice() should throw error", () => {
    const file = createStreamFile();

    expect(() => file.slice()).toThrow(".slice() is not supported");
  });

  test("Symbol.toStringTag should return StreamFile", () => {
    const file = createStreamFile();

    expect(file[Symbol.toStringTag]).toBe("StreamFile");
  });

  test("toReadable() should return the underlying Readable stream", () => {
    const file = createStreamFile();

    const readable = file.toReadable();

    expect(readable).toBeInstanceOf(Readable);
  });

  test("toReadable() should return null after stream is consumed", async () => {
    const file = createStreamFile();

    await file.bytes();

    expect(file.toReadable()).toBeNull();
  });

  test("toFile() should return a standard File with content", async () => {
    const content = "Hello, World!";
    const file = createStreamFile(content);

    const standardFile = await file.toFile();

    expect(standardFile).toBeInstanceOf(File);
    expect(standardFile.name).toBe("test.txt");
    expect(standardFile.type).toContain("text/plain");
    expect(await standardFile.text()).toBe(content);
  });

  test("toJSON() should return file metadata", () => {
    const file = createStreamFile();

    const json = file.toJSON();

    expect(json).toEqual({
      name: "test.txt",
      size: Infinity,
      type: expect.stringContaining("text/plain"),
      lastModified: expect.any(Number),
    });
  });

  test("toJSON() should return actual size after buffering", async () => {
    const content = "Hello!";
    const file = createStreamFile(content);

    await file.bytes();
    const json = file.toJSON();

    expect(json.size).toBe(content.length);
  });
});
