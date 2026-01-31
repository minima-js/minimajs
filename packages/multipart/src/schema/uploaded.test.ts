import { describe, test, expect, afterEach } from "@jest/globals";
import { z } from "zod";
import { setTimeout as sleep } from "node:timers/promises";
import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mockContext } from "@minimajs/server/mock";
import { createApp } from "@minimajs/server";
import { getUploadedBody } from "./uploaded.js";
import { isUploadedFile, TempFile } from "./file.js";

// Helper to create multipart form data stream
async function* createMultipartStream(
  boundary: string,
  parts: Array<{ name: string; filename?: string; contentType?: string; data: string }>
) {
  for (const part of parts) {
    part.contentType ||= "application/octet-stream";
    yield `--${boundary}\r\n`;
    if (part.filename) {
      yield `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`;
      yield `Content-Type: ${part.contentType}\r\n`;
    } else {
      yield `Content-Disposition: form-data; name="${part.name}"\r\n`;
    }
    yield `\r\n`;
    yield `${part.data}\r\n`;
    await sleep(1);
  }
  yield `--${boundary}--\r\n`;
}

function createMockContext(boundary: string, parts: Parameters<typeof createMultipartStream>[1]) {
  return {
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    body: createMultipartStream(boundary, parts),
  };
}

function createMultipartBody(
  boundary: string,
  parts: Array<{ name: string; filename?: string; contentType?: string; data: string }>
): string {
  let body = "";
  for (const part of parts) {
    const contentType = part.contentType || "application/octet-stream";
    body += `--${boundary}\r\n`;
    if (part.filename) {
      body += `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`;
      body += `Content-Type: ${contentType}\r\n`;
    } else {
      body += `Content-Disposition: form-data; name="${part.name}"\r\n`;
    }
    body += `\r\n`;
    body += `${part.data}\r\n`;
  }
  body += `--${boundary}--\r\n`;
  return body;
}

describe("getUploadedBody", () => {
  const testTmpDir = join(tmpdir(), "minimajs-uploaded-test");

  afterEach(async () => {
    await rm(testTmpDir, { recursive: true, force: true });
  });

  describe("text fields", () => {
    test("should parse simple text fields", async () => {
      const boundary = "----boundary123";
      const schema = {
        name: z.string(),
        email: z.string().email(),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, {});
          expect(result.name).toBe("John Doe");
          expect(result.email).toBe("john@example.com");
        },
        createMockContext(boundary, [
          { name: "name", data: "John Doe" },
          { name: "email", data: "john@example.com" },
        ])
      );
    });

    test("should parse array of text fields", async () => {
      const boundary = "----boundary123";
      const schema = {
        tags: z.array(z.string()),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, {});
          expect(result.tags).toEqual(["javascript", "typescript", "node"]);
        },
        createMockContext(boundary, [
          { name: "tags", data: "javascript" },
          { name: "tags", data: "typescript" },
          { name: "tags", data: "node" },
        ])
      );
    });

    test("should throw ZodError for invalid text fields", async () => {
      const boundary = "----boundary123";
      const schema = {
        email: z.string().email(),
      };

      await mockContext(
        async (ctx) => {
          await expect(getUploadedBody(schema, ctx, {})).rejects.toThrow(z.ZodError);
        },
        createMockContext(boundary, [{ name: "email", data: "not-an-email" }])
      );
    });
  });

  describe("file uploads", () => {
    test("should upload single file to temp directory", async () => {
      const boundary = "----boundary123";
      await mkdir(testTmpDir, { recursive: true });

      const schema = {
        avatar: z.file(),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, { tmpDir: testTmpDir });
          expect(isUploadedFile(result.avatar)).toBe(true);
          expect(result.avatar.name).toBe("profile.png");
          expect(result.avatar.type).toBe("image/png");
          expect(await result.avatar.text()).toBe("fake-image-data");
        },
        createMockContext(boundary, [
          { name: "avatar", filename: "profile.png", contentType: "image/png", data: "fake-image-data" },
        ])
      );
    });

    test("should upload multiple files as array", async () => {
      const boundary = "----boundary123";
      await mkdir(testTmpDir, { recursive: true });

      const schema = {
        documents: z.array(z.file()),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, { tmpDir: testTmpDir });
          expect(Array.isArray(result.documents)).toBe(true);
          expect(result.documents).toHaveLength(2);
          expect(result.documents[0]!.name).toBe("doc1.pdf");
          expect(result.documents[1]!.name).toBe("doc2.pdf");
        },
        createMockContext(boundary, [
          { name: "documents", filename: "doc1.pdf", contentType: "application/pdf", data: "pdf-content-1" },
          { name: "documents", filename: "doc2.pdf", contentType: "application/pdf", data: "pdf-content-2" },
        ])
      );
    });

    test("should discard files not in schema", async () => {
      const boundary = "----boundary123";
      const schema = {
        name: z.string(),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, {});
          expect(result.name).toBe("John");
          expect((result as any).unknown).toBeUndefined();
        },
        createMockContext(boundary, [
          { name: "name", data: "John" },
          { name: "unknown", filename: "file.txt", data: "should be discarded" },
        ])
      );
    });

    test("should enforce max file count on arrays", async () => {
      const boundary = "----boundary123";
      await mkdir(testTmpDir, { recursive: true });

      const schema = {
        files: z.array(z.file()).max(2),
      };

      await mockContext(
        async (ctx) => {
          await expect(getUploadedBody(schema, ctx, { tmpDir: testTmpDir })).rejects.toThrow(z.ZodError);
        },
        createMockContext(boundary, [
          { name: "files", filename: "file1.txt", data: "content1" },
          { name: "files", filename: "file2.txt", data: "content2" },
          { name: "files", filename: "file3.txt", data: "content3" },
        ])
      );
    });
  });

  describe("mixed fields and files", () => {
    test("should handle text fields and files together", async () => {
      const boundary = "----boundary123";
      await mkdir(testTmpDir, { recursive: true });

      const schema = {
        title: z.string(),
        description: z.string().optional(),
        attachment: z.file(),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, { tmpDir: testTmpDir });
          expect(result.title).toBe("My Document");
          expect(result.description).toBe("A test document");
          expect(isUploadedFile(result.attachment)).toBe(true);
          expect(result.attachment.name).toBe("doc.pdf");
        },
        createMockContext(boundary, [
          { name: "title", data: "My Document" },
          { name: "description", data: "A test document" },
          { name: "attachment", filename: "doc.pdf", contentType: "application/pdf", data: "pdf-data" },
        ])
      );
    });

    test("should handle text arrays and file arrays together", async () => {
      const boundary = "----boundary123";
      await mkdir(testTmpDir, { recursive: true });

      const schema = {
        tags: z.array(z.string()),
        images: z.array(z.file()),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, { tmpDir: testTmpDir });
          expect(result.tags).toEqual(["photo", "vacation"]);
          expect(result.images).toHaveLength(2);
          expect(result.images[0]!.name).toBe("img1.jpg");
          expect(result.images[1]!.name).toBe("img2.jpg");
        },
        createMockContext(boundary, [
          { name: "tags", data: "photo" },
          { name: "images", filename: "img1.jpg", contentType: "image/jpeg", data: "jpeg-data-1" },
          { name: "tags", data: "vacation" },
          { name: "images", filename: "img2.jpg", contentType: "image/jpeg", data: "jpeg-data-2" },
        ])
      );
    });
  });

  describe("validation", () => {
    test("should validate required fields", async () => {
      const boundary = "----boundary123";
      const schema = {
        name: z.string(),
        email: z.string(),
      };

      await mockContext(
        async (ctx) => {
          await expect(getUploadedBody(schema, ctx, {})).rejects.toThrow(z.ZodError);
        },
        createMockContext(boundary, [{ name: "name", data: "John" }])
      );
    });

    test("should apply string transformations", async () => {
      const boundary = "----boundary123";
      const schema = {
        username: z.string().toLowerCase().trim(),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, {});
          expect(result.username).toBe("johndoe");
        },
        createMockContext(boundary, [{ name: "username", data: "  JohnDoe  " }])
      );
    });

    test("should coerce numbers from string fields", async () => {
      const boundary = "----boundary123";
      const schema = {
        age: z.coerce.number().min(0),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, {});
          expect(result.age).toBe(25);
          expect(typeof result.age).toBe("number");
        },
        createMockContext(boundary, [{ name: "age", data: "25" }])
      );
    });
  });

  describe("temp directory", () => {
    test("should use custom temp directory", async () => {
      const boundary = "----boundary123";
      await mkdir(testTmpDir, { recursive: true });

      const schema = {
        file: z.file(),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, { tmpDir: testTmpDir });
          expect((result.file as TempFile).path.startsWith(testTmpDir)).toBe(true);
        },
        createMockContext(boundary, [{ name: "file", filename: "test.txt", data: "content" }])
      );
    });

    test("should create nested temp directory if needed", async () => {
      const boundary = "----boundary123";
      const nestedTmpDir = join(testTmpDir, "nested", "path");

      const schema = {
        file: z.file(),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, { tmpDir: nestedTmpDir });
          expect(isUploadedFile(result.file)).toBe(true);
        },
        createMockContext(boundary, [{ name: "file", filename: "test.txt", data: "content" }])
      );
    });
  });

  describe("file size validation", () => {
    test("should throw ZodError when file exceeds max size", async () => {
      const boundary = "----boundary123";
      await mkdir(testTmpDir, { recursive: true });

      const schema = {
        file: z.file().max(5), // Max 5 bytes
      };

      await mockContext(
        async (ctx) => {
          await expect(getUploadedBody(schema, ctx, { tmpDir: testTmpDir })).rejects.toThrow(z.ZodError);
        },
        createMockContext(boundary, [{ name: "file", filename: "large.txt", data: "This content is way too long" }])
      );
    });

    test("should accept file within size limit", async () => {
      const boundary = "----boundary123";
      await mkdir(testTmpDir, { recursive: true });

      const schema = {
        file: z.file().max(1024), // 1KB limit
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, { tmpDir: testTmpDir });
          expect(isUploadedFile(result.file)).toBe(true);
        },
        createMockContext(boundary, [{ name: "file", filename: "small.txt", data: "small" }])
      );
    });
  });

  describe("cleanup", () => {
    test("should skip fields not in schema", async () => {
      const boundary = "----boundary123";
      const schema = {
        name: z.string(),
      };

      await mockContext(
        async (ctx) => {
          const result = await getUploadedBody(schema, ctx, {});
          expect(result.name).toBe("test");
          expect((result as any).unknownField).toBeUndefined();
        },
        createMockContext(boundary, [
          { name: "name", data: "test" },
          { name: "unknownField", data: "should be ignored" },
        ])
      );
    });
  });

  describe("defer cleanup", () => {
    test("should cleanup uploaded files after request completes", async () => {
      const boundary = "----boundary123";
      await mkdir(testTmpDir, { recursive: true });

      let uploadedFilePath: string | undefined;

      const app = createApp();
      app.post("/upload", async (ctx) => {
        const result = await getUploadedBody({ file: z.file() }, ctx as any, { tmpDir: testTmpDir });
        uploadedFilePath = (result.file as TempFile).path;
        // Verify file exists during request
        await stat(uploadedFilePath);
        return new Response("ok");
      });

      const body = createMultipartBody(boundary, [{ name: "file", filename: "test.txt", data: "content" }]);

      const response = await app.handle(
        new Request("http://localhost/upload", {
          method: "POST",
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body,
        })
      );

      expect(response.status).toBe(200);
      expect(uploadedFilePath).toBeDefined();
      // Wait for defer callback to complete (async)
      await sleep(1);
      // After request completes, defer should have deleted the file
      await expect(stat(uploadedFilePath!)).rejects.toThrow();
    });
  });
});
