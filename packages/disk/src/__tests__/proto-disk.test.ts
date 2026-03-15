import { describe, beforeEach, it, expect, jest } from "@jest/globals";
import { createProtoDisk } from "../index.js";
import { createMemoryDriver } from "../adapters/memory.js";
import type { DiskDriver } from "../types.js";

describe("ProtoDisk - Prefix-Based Routing", () => {
  let bucket1Driver: DiskDriver;
  let bucket2Driver: DiskDriver;
  let fsDriver: DiskDriver;

  beforeEach(() => {
    // Create separate drivers for testing
    bucket1Driver = createMemoryDriver();
    bucket2Driver = createMemoryDriver();
    fsDriver = createMemoryDriver();
  });

  describe("Longest Prefix Matching", () => {
    it("should route to most specific prefix match", async () => {
      const disk = createProtoDisk({
        protocols: {
          "s3://": bucket1Driver, // Generic S3
          "s3://bucket-2/": bucket2Driver, // Specific bucket
          "file://": fsDriver,
        },
      });

      // Should use bucket2Driver (longer prefix)
      await disk.put("s3://bucket-2/file.txt", "content for bucket 2");
      const file = await disk.get("s3://bucket-2/file.txt");
      expect(file).not.toBeNull();

      // Verify it's in bucket2 driver, not bucket1
      const fromBucket2 = await bucket2Driver.get("s3://bucket-2/file.txt", {});
      expect(fromBucket2).not.toBeNull();

      const fromBucket1 = await bucket1Driver.get("s3://bucket-2/file.txt", {});
      expect(fromBucket1).toBeNull();
    });

    it("should fallback to shorter prefix if longer doesn't match", async () => {
      const disk = createProtoDisk({
        protocols: {
          "s3://": bucket1Driver,
          "s3://bucket-2/": bucket2Driver,
        },
      });

      // Should use bucket1Driver (protocol-only match)
      await disk.put("s3://bucket-1/file.txt", "content for bucket 1");
      const file = await disk.get("s3://bucket-1/file.txt");
      expect(file).not.toBeNull();

      // Verify it's in bucket1 driver
      const fromBucket1 = await bucket1Driver.get("s3://bucket-1/file.txt", {});
      expect(fromBucket1).not.toBeNull();
    });
  });

  describe("Bucket-Specific Routing", () => {
    it("should route different buckets to different drivers", async () => {
      const disk = createProtoDisk({
        protocols: {
          "s3://images-bucket/": bucket1Driver,
          "s3://videos-bucket/": bucket2Driver,
        },
      });

      await disk.put("s3://images-bucket/photo.jpg", "image data");
      await disk.put("s3://videos-bucket/clip.mp4", "video data");

      // Verify routing
      const image = await bucket1Driver.get("s3://images-bucket/photo.jpg", {});
      expect(image).not.toBeNull();

      const video = await bucket2Driver.get("s3://videos-bucket/clip.mp4", {});
      expect(video).not.toBeNull();

      // Cross-check they're isolated
      const imageInBucket2 = await bucket2Driver.get("s3://images-bucket/photo.jpg", {});
      expect(imageInBucket2).toBeNull();
    });
  });

  describe("Domain-Specific Routing", () => {
    it("should route different domains to different drivers", async () => {
      const disk = createProtoDisk({
        protocols: {
          "https://cdn1.example.com/": bucket1Driver,
          "https://cdn2.example.com/": bucket2Driver,
        },
      });

      await disk.put("https://cdn1.example.com/logo.png", "logo data");
      await disk.put("https://cdn2.example.com/banner.png", "banner data");

      const logo = await bucket1Driver.get("https://cdn1.example.com/logo.png", {});
      expect(logo).not.toBeNull();

      const banner = await bucket2Driver.get("https://cdn2.example.com/banner.png", {});
      expect(banner).not.toBeNull();
    });
  });

  describe("Cross-Driver Operations", () => {
    it("should copy files between different prefixes/drivers", async () => {
      const disk = createProtoDisk({
        protocols: {
          "s3://bucket-1/": bucket1Driver,
          "s3://bucket-2/": bucket2Driver,
        },
      });

      // Put file in bucket1
      await disk.put("s3://bucket-1/source.txt", "original content");

      // Copy to bucket2 (different driver)
      await disk.copy("s3://bucket-1/source.txt", "s3://bucket-2/copied.txt");

      // Verify both exist
      const source = await bucket1Driver.get("s3://bucket-1/source.txt", {});
      expect(source).not.toBeNull();

      const copied = await bucket2Driver.get("s3://bucket-2/copied.txt", {});
      expect(copied).not.toBeNull();

      if (copied) {
        const [_stream, metadata] = copied;
        expect(metadata.href).toBe("s3://bucket-2/copied.txt");
      }
    });

    it("should move files between different prefixes/drivers", async () => {
      const disk = createProtoDisk({
        protocols: {
          "s3://bucket-1/": bucket1Driver,
          "s3://bucket-2/": bucket2Driver,
        },
      });

      // Put file in bucket1
      await disk.put("s3://bucket-1/source.txt", "original content");

      // Move to bucket2 (different driver)
      await disk.move("s3://bucket-1/source.txt", "s3://bucket-2/moved.txt");

      // Source should be deleted
      const source = await bucket1Driver.get("s3://bucket-1/source.txt", {});
      expect(source).toBeNull();

      // Destination should exist
      const moved = await bucket2Driver.get("s3://bucket-2/moved.txt", {});
      expect(moved).not.toBeNull();
    });

    it("should delete source when moving a DiskFile from another disk", async () => {
      const diskA = createProtoDisk({
        protocols: {
          "s3://bucket-1/": bucket1Driver,
        },
      });
      const diskB = createProtoDisk({
        protocols: {
          "s3://bucket-2/": bucket2Driver,
        },
      });

      await diskA.put("s3://bucket-1/source.txt", "from-a");
      const sourceFile = await diskA.get("s3://bucket-1/source.txt");
      expect(sourceFile).toBeTruthy();

      await diskB.move(sourceFile!, "s3://bucket-2/dest.txt");

      expect(await diskA.exists("s3://bucket-1/source.txt")).toBe(false);
      expect(await diskB.exists("s3://bucket-2/dest.txt")).toBe(true);
    });
  });

  describe("Same-Driver Optimization", () => {
    it("should use native driver copy for same prefix", async () => {
      const copySpy = jest.spyOn(bucket1Driver, "copy");

      const disk = createProtoDisk({
        protocols: {
          "s3://bucket-1/": bucket1Driver,
        },
      });

      await disk.put("s3://bucket-1/source.txt", "content");
      await disk.copy("s3://bucket-1/source.txt", "s3://bucket-1/dest.txt");

      // Should use native driver copy (not get + put)
      expect(copySpy).toHaveBeenCalledWith("s3://bucket-1/source.txt", "s3://bucket-1/dest.txt", {});
    });

    it("should use native driver move for same prefix", async () => {
      const moveSpy = jest.spyOn(bucket1Driver, "move");

      const disk = createProtoDisk({
        protocols: {
          "s3://bucket-1/": bucket1Driver,
        },
      });

      await disk.put("s3://bucket-1/source.txt", "content");
      await disk.move("s3://bucket-1/source.txt", "s3://bucket-1/dest.txt");

      // Should use native driver move (not get + put + delete)
      expect(moveSpy).toHaveBeenCalledWith("s3://bucket-1/source.txt", "s3://bucket-1/dest.txt", {});
    });
  });

  describe("Error Handling", () => {
    it("should throw error for unregistered prefix", async () => {
      const disk = createProtoDisk({
        protocols: {
          "s3://bucket-1/": bucket1Driver,
        },
      });

      await expect(disk.put("https://unknown.com/file.txt", "content")).rejects.toThrow(/No driver registered for href/);
    });

    it("should provide helpful error message with available prefixes", async () => {
      const disk = createProtoDisk({
        protocols: {
          "s3://bucket-1/": bucket1Driver,
          "s3://bucket-2/": bucket2Driver,
          "file://": fsDriver,
        },
      });

      try {
        await disk.put("https://unknown.com/file.txt", "content");
      } catch (error: any) {
        expect(error.message).toContain("s3://bucket-1/");
        expect(error.message).toContain("s3://bucket-2/");
        expect(error.message).toContain("file://");
      }
    });
  });

  describe("Default Protocol", () => {
    it("should use default protocol for relative paths", async () => {
      const disk = createProtoDisk({
        protocols: {
          "s3://bucket-1/": bucket1Driver,
          "file://": fsDriver,
        },
        defaultProtocol: "file://",
        basePath: "/uploads",
      });

      // Relative path should use default protocol
      await disk.put("images/avatar.jpg", "image data");

      // Should be accessible via file:// protocol
      const file = await disk.get("file:///uploads/images/avatar.jpg");
      expect(file).not.toBeNull();
    });
  });

  describe("Hooks", () => {
    it("runs storing hook on put", async () => {
      const disk = createProtoDisk({
        protocols: {
          "s3://bucket-1/": bucket1Driver,
        },
        hooks: {
          storing(_path, stream) {
            return stream.pipeThrough(
              new TransformStream<Uint8Array, Uint8Array>({
                transform(chunk, controller) {
                  const text = new TextDecoder().decode(chunk).toUpperCase();
                  controller.enqueue(new TextEncoder().encode(text));
                },
              })
            );
          },
        },
      });

      await disk.put("s3://bucket-1/value.txt", "abc");
      const file = await disk.get("s3://bucket-1/value.txt");
      expect(file).not.toBeNull();
      expect(await file?.text()).toBe("ABC");
    });
  });
});
