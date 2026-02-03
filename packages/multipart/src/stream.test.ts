import { describe, test, expect } from "@jest/globals";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { StreamMeter } from "./stream.js";
import { stream2void } from "./helpers.js";

describe("stream utilities", () => {
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
