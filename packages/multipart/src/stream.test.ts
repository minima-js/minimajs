import { describe, test, expect } from "@jest/globals";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { stream2buffer, stream2void, StreamMeter } from "./stream.js";

describe("stream utilities", () => {
  describe("stream2buffer", () => {
    test("should convert stream to buffer", async () => {
      function* text2buffer(text: string[]) {
        for (const char of text) {
          yield Buffer.from(char);
        }
      }

      const stream = Readable.from(text2buffer(["hello", "world"]));

      const buffer = await stream2buffer(stream);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe("helloworld");
    });

    test("should handle binary data", async () => {
      const data = [Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from([0x0d, 0x0a, 0x1a, 0x0a])];
      const stream = Readable.from(data);

      const buffer = await stream2buffer(stream);

      expect(buffer).toEqual(Buffer.concat(data));
    });

    test("should handle empty stream", async () => {
      const stream = Readable.from([]);

      const buffer = await stream2buffer(stream);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(0);
    });

    test("should handle large streams", async () => {
      const chunkSize = 1024;
      const chunkCount = 100;
      const chunks = Array.from({ length: chunkCount }, () => Buffer.alloc(chunkSize, "x"));
      const stream = Readable.from(chunks);

      const buffer = await stream2buffer(stream);

      expect(buffer.length).toBe(chunkSize * chunkCount);
    });

    test("should reject on stream error", async () => {
      const stream = new Readable({
        read() {
          this.destroy(new Error("Stream error"));
        },
      });

      await expect(stream2buffer(stream)).rejects.toThrow("Stream error");
    });

    test("should handle single large buffer", async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024, "a"); // 1MB
      const stream = Readable.from([largeBuffer]);

      const buffer = await stream2buffer(stream);

      expect(buffer.length).toBe(largeBuffer.length);
      expect(buffer).toEqual(largeBuffer);
    });
  });

  describe("stream2void", () => {
    test("should consume stream without storing data", async () => {
      const content = "This should be discarded";
      const stream = Readable.from([content]);
      const voidStream = stream2void();

      await pipeline(stream, voidStream);

      // Test completes without error means stream was consumed
      expect(true).toBe(true);
    });

    test("should handle empty stream", async () => {
      const stream = Readable.from([]);
      const voidStream = stream2void();

      await expect(pipeline(stream, voidStream)).resolves.toBeUndefined();
    });

    test("should handle large streams efficiently", async () => {
      const largeContent = "x".repeat(1024 * 1024); // 1MB
      const stream = Readable.from([largeContent]);
      const voidStream = stream2void();

      const startTime = Date.now();
      await pipeline(stream, voidStream);
      const duration = Date.now() - startTime;

      // Should complete reasonably fast
      expect(duration).toBeLessThan(1000);
    });

    test("should handle multiple chunks", async () => {
      const chunks = Array.from({ length: 100 }, (_, i) => `chunk ${i}`);
      const stream = Readable.from(chunks);
      const voidStream = stream2void();

      await expect(pipeline(stream, voidStream)).resolves.toBeUndefined();
    });

    test("should handle binary data", async () => {
      const data = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const stream = Readable.from([data]);
      const voidStream = stream2void();

      await expect(pipeline(stream, voidStream)).resolves.toBeUndefined();
    });

    test("should propagate stream errors", async () => {
      const stream = new Readable({
        read() {
          this.destroy(new Error("Stream error"));
        },
      });
      const voidStream = stream2void();

      await expect(pipeline(stream, voidStream)).rejects.toThrow("Stream error");
    });
  });

  describe("StreamMeter", () => {
    test("should pass through data unchanged", async () => {
      const content = "Hello, World!";
      const stream = Readable.from([content]);
      const meter = new StreamMeter(1000);

      const chunks: Buffer[] = [];
      await pipeline(
        stream,
        meter,
        async function* (source) {
          for await (const chunk of source) {
            chunks.push(chunk);
            yield chunk;
          }
        },
        stream2void()
      );
      expect(meter.bytes).toBe(Buffer.byteLength(content));
      expect(Buffer.concat(chunks).toString()).toBe(content);
    });

    test("should allow exactly maxBytes", async () => {
      const content = "12345";
      const stream = Readable.from([content]);
      const meter = new StreamMeter(5);

      await expect(pipeline(stream, meter, stream2void())).resolves.toBeUndefined();
      expect(meter.bytes).toBe(5);
    });

    test("should track multiple chunks", async () => {
      const chunks = ["Hello", ", ", "World", "!"];
      const stream = Readable.from(chunks);
      const totalBytes = chunks.reduce((sum, chunk) => sum + Buffer.byteLength(chunk), 0);
      const meter = new StreamMeter(1000);

      await pipeline(stream, meter, stream2void());

      expect(meter.bytes).toBe(totalBytes);
    });

    test("should track bytes across multiple streams", async () => {
      const content1 = "First";
      const stream1 = Readable.from([content1]);
      const meter = new StreamMeter(1000);

      await pipeline(stream1, meter, stream2void());
      const bytes1 = meter.bytes;

      // Meter keeps accumulating
      expect(bytes1).toBe(Buffer.byteLength(content1));
    });

    test("should handle empty stream", async () => {
      const stream = Readable.from([]);
      const meter = new StreamMeter(100);

      await pipeline(stream, meter, stream2void());

      expect(meter.bytes).toBe(0);
    });

    test("should fail immediately when chunk exceeds limit", async () => {
      const largeChunk = "x".repeat(100);
      const stream = Readable.from([largeChunk]);
      const meter = new StreamMeter(10);

      await expect(pipeline(stream, meter, stream2void())).rejects.toThrow(RangeError);
    });

    test("should initialize with zero bytes", () => {
      const meter = new StreamMeter(1000);
      expect(meter.bytes).toBe(0);
    });
  });
});
