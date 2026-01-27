import { describe, test, expect } from "@jest/globals";
import { Readable } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";
import { multipart } from "./multipart.js";
import { mockContext } from "@minimajs/server/mock";
import { isFile } from "./helpers.js";

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

describe("multipart", () => {
  describe("file", () => {
    test("should retrieve first file without name parameter", async () => {
      const boundary = "----boundary123";

      const stream = createMultipartStream(boundary, [
        { name: "avatar", filename: "profile.png", contentType: "image/png", data: "fake-image-data" },
      ]);

      await mockContext(
        async () => {
          const file = await multipart.file("avatar");
          expect(file).toBeInstanceOf(File);
          expect(file?.name).toBe("profile.png");
          expect(file?.type).toBe("image/png");
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream,
        }
      );
    });

    test("should retrieve file by specific field name", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [
        { name: "document", filename: "report.pdf", contentType: "application/pdf", data: "pdf-data" },
        { name: "avatar", filename: "profile.png", contentType: "image/png", data: "image-data" },
      ]);
      await mockContext(
        async () => {
          const file = await multipart.file("avatar");
          expect(file?.name).toBe("profile.png");
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream,
        }
      );
    });

    test("should reject when no file found", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [{ name: "name", data: "John Doe" }]);

      await mockContext(
        async () => {
          expect(await multipart.file("name")).toBe(null);
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });

    test("should reject when named file not found", async () => {
      const boundary = "----boundary123";
      const stream = Readable.from(
        createMultipartStream(boundary, [
          { name: "avatar", filename: "profile.png", contentType: "image/png", data: "image-data" },
        ])
      );

      await mockContext(
        async () => {
          expect(await multipart.file("document")).toBe(null);
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });

    test("should handle file with encoding", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [
        { name: "file", filename: "test.txt", contentType: "text/plain", data: "Hello World" },
      ]);

      await mockContext(
        async () => {
          const file = await multipart.file("file");

          expect(file?.type).toBe("text/plain;charset=utf-8");
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });

    test("should throw ValidationError when content-type header missing", async () => {
      const stream = Readable.from([""]);
      await mockContext(
        async () => {
          await expect(multipart.file("")).rejects.toThrow();
        },
        {
          body: stream as any,
        }
      );
    });
  });

  describe("files", () => {
    test("should iterate over all files", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [
        { name: "file1", filename: "doc1.pdf", contentType: "application/pdf", data: "pdf1" },
        { name: "file2", filename: "doc2.pdf", contentType: "application/pdf", data: "pdf2" },
        { name: "file3", filename: "image.png", contentType: "image/png", data: "png" },
      ]);

      await mockContext(
        async () => {
          const files: File[] = [];
          for await (const [_name, file] of multipart.files()) {
            files.push(file);
          }

          expect(files.length).toBe(3);
          expect(files[0]?.name).toBe("doc1.pdf");
          expect(files[1]?.name).toBe("doc2.pdf");
          expect(files[2]?.name).toBe("image.png");
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream,
        }
      );
    });

    test("should handle empty file list", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [{ name: "name", data: "John" }]);

      await mockContext(
        async () => {
          const files: File[] = [];

          for await (const [, file] of multipart.files()) {
            files.push(file);
          }
          expect(files.length).toBe(0);
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });

    test("should ignore text fields", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [
        { name: "name", data: "John" },
        { name: "file", filename: "test.txt", contentType: "text/plain", data: "content" },
        { name: "email", data: "john@example.com" },
      ]);

      await mockContext(
        async () => {
          const files: File[] = [];
          for await (const [_field, file] of multipart.files()) {
            files.push(file);
          }

          expect(files.length).toBe(1);
          expect(files[0]!.name).toBe("test.txt");
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream,
        }
      );
    });
  });

  describe("fields", () => {
    test("should retrieve all text fields", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [
        { name: "name", data: "John Doe" },
        { name: "email", data: "john@example.com" },
        { name: "age", data: "30" },
      ]);

      await mockContext(
        async () => {
          const fields = await multipart.fields<{ name: string; email: string; age: string }>();
          expect(fields.name).toBe("John Doe");
          expect(fields.email).toBe("john@example.com");
          expect(fields.age).toBe("30");
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream,
        }
      );
    });

    test("should ignore files", async () => {
      const boundary = "----boundary123";
      const stream = Readable.from(
        createMultipartStream(boundary, [
          { name: "name", data: "John" },
          { name: "avatar", filename: "profile.png", contentType: "image/png", data: "image" },
          { name: "email", data: "john@example.com" },
        ])
      );

      await mockContext(
        async () => {
          const fields = await multipart.fields();

          expect(fields.name).toBe("John");
          expect(fields.email).toBe("john@example.com");
          expect(fields.avatar).toBeUndefined();
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });

    test("should return empty object when no fields", async () => {
      const boundary = "----boundary123";
      const stream = Readable.from(createMultipartStream(boundary, []));

      await mockContext(
        async () => {
          const fields = await multipart.fields();

          expect(Object.keys(fields).length).toBe(0);
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });

    test("should handle special characters in field values", async () => {
      const boundary = "----boundary123";
      const stream = Readable.from(
        createMultipartStream(boundary, [{ name: "description", data: "Special chars: <>&\"'/@#$%" }])
      );

      await mockContext(
        async () => {
          const fields = await multipart.fields();

          expect(fields.description).toBe("Special chars: <>&\"'/@#$%");
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });
  });

  describe("body", () => {
    test("should iterate over all fields and files", async () => {
      const boundary = "----boundary123";
      const stream = Readable.from(
        createMultipartStream(boundary, [
          { name: "name", data: "John Doe" },
          { name: "avatar", filename: "profile.png", contentType: "image/png", data: "image-data" },
          { name: "email", data: "john@example.com" },
          { name: "document", filename: "doc.pdf", contentType: "application/pdf", data: "pdf-data" },
        ])
      );

      await mockContext(
        async () => {
          const items: Array<[string, string | File]> = [];
          for await (const item of multipart.body()) {
            items.push(item);
          }
          expect(items.length).toBe(4);
          expect(items[0]?.[0]).toBe("name");
          expect(items[0]?.[1]).toBe("John Doe");
          expect(items[1]?.[0]).toBe("avatar");
          expect(isFile(items[1]?.[1])).toBe(true);
          expect((items[1]?.[1] as File).name).toBe("profile.png");
          expect(items[2]?.[0]).toBe("email");
          expect(items[2]?.[1]).toBe("john@example.com");
          expect(items[3]?.[0]).toBe("document");
          expect(isFile(items[3]?.[1])).toBe(true);
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream,
        }
      );
    });

    test("should handle only fields", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [
        { name: "field1", data: "value1" },
        { name: "field2", data: "value2" },
      ]);

      await mockContext(
        async () => {
          const items: Array<[string, string | File]> = [];

          for await (const item of multipart.body()) {
            items.push(item);
          }

          expect(items.length).toBe(2);
          expect(items.every(([, value]) => typeof value === "string")).toBe(true);
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });

    test("should handle only files", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [
        { name: "file1", filename: "doc1.pdf", contentType: "application/pdf", data: "pdf1" },
        { name: "file2", filename: "doc2.pdf", contentType: "application/pdf", data: "pdf2" },
      ]);

      await mockContext(
        async () => {
          const items: Array<[string, string | File]> = [];

          for await (const item of multipart.body()) {
            items.push(item);
          }

          expect(items.length).toBe(2);
          expect(items.every(([, value]) => isFile(value))).toBe(true);
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream,
        }
      );
    });

    test("should handle empty body", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, []);

      await mockContext(
        async () => {
          const items: Array<[string, string | File]> = [];

          for await (const item of multipart.body()) {
            items.push(item);
          }

          expect(items.length).toBe(0);
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });

    test("should differentiate between string and File values", async () => {
      const boundary = "----boundary123";
      const stream = createMultipartStream(boundary, [
        { name: "text", data: "text value" },
        { name: "file", filename: "test.txt", contentType: "text/plain", data: "file content" },
      ]);

      await mockContext(
        async () => {
          const items: Array<[string, string | File]> = [];

          for await (const item of multipart.body()) {
            items.push(item);
          }

          const [name1, value1] = items[0]!;
          const [name2, value2] = items[1]!;

          expect(name1).toBe("text");
          expect(typeof value1).toBe("string");

          expect(name2).toBe("file");
          expect(isFile(value2)).toBe(true);
        },
        {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
          body: stream as any,
        }
      );
    });
  });
});
