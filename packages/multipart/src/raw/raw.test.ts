import { describe, test, expect } from "@jest/globals";
import { setTimeout as sleep } from "node:timers/promises";
import { mockContext } from "@minimajs/server/mock";
import * as raw from "./index.js";
import { RAW_FILE, RAW_FIELD } from "./index.js";
import { isRawFile, stream2buffer } from "../helpers.js";
import type { MultipartRawResult } from "../types.js";

async function* multipartStream(
  boundary: string,
  parts: Array<{ name: string; filename?: string; contentType?: string; data: string }>
) {
  for (const part of parts) {
    yield `--${boundary}\r\n`;
    yield part.filename
      ? `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: ${part.contentType || "application/octet-stream"}\r\n`
      : `Content-Disposition: form-data; name="${part.name}"\r\n`;
    yield `\r\n${part.data}\r\n`;
    await sleep(1);
  }
  yield `--${boundary}--\r\n`;
}

describe("raw", () => {
  const boundary = "----test";
  const headers = { "content-type": `multipart/form-data; boundary=${boundary}` };

  test("RAW_FILE and RAW_FIELD symbols", () => {
    expect(RAW_FILE.toString()).toContain("raw-file");
    expect(RAW_FIELD.toString()).toContain("raw-field");
  });

  test("file() returns raw file by name with stream", async () => {
    const stream = multipartStream(boundary, [
      { name: "avatar", filename: "pic.png", contentType: "image/png", data: "data" },
    ]);

    await mockContext(
      async () => {
        const file = await raw.file("avatar");
        expect(file?.fieldname).toBe("avatar");
        expect(file?.filename).toBe("pic.png");
        expect(file?.[RAW_FILE]).toBe(true);
        expect(isRawFile(file)).toBe(true);
        expect((await stream2buffer(file!.stream)).toString()).toBe("data");
      },
      { headers, body: stream }
    );
  });

  test("file() returns null when not found", async () => {
    const stream = multipartStream(boundary, [{ name: "name", data: "John" }]);
    await mockContext(async () => expect(await raw.file("avatar")).toBeNull(), { headers, body: stream });
  });

  test("firstFile() returns first file", async () => {
    const stream = multipartStream(boundary, [
      { name: "f1", filename: "a.txt", data: "first" },
      { name: "f2", filename: "b.txt", data: "second" },
    ]);

    await mockContext(
      async () => {
        const file = await raw.firstFile();
        expect(file?.filename).toBe("a.txt");
        await stream2buffer(file!.stream);
      },
      { headers, body: stream }
    );
  });

  test("files() iterates all files", async () => {
    const stream = multipartStream(boundary, [
      { name: "f1", filename: "a.pdf", data: "1" },
      { name: "f2", filename: "b.pdf", data: "2" },
    ]);

    await mockContext(
      async () => {
        const names: string[] = [];
        for await (const f of raw.files()) {
          names.push(f.filename);
          await stream2buffer(f.stream);
        }
        expect(names).toEqual(["a.pdf", "b.pdf"]);
      },
      { headers, body: stream }
    );
  });

  test("body() iterates fields and files with symbols", async () => {
    const stream = multipartStream(boundary, [
      { name: "name", data: "John" },
      { name: "file", filename: "test.txt", data: "content" },
    ]);

    await mockContext(
      async () => {
        const items: MultipartRawResult[] = [];
        for await (const item of raw.body()) {
          if (isRawFile(item)) await stream2buffer(item.stream);
          items.push(item);
        }
        expect((items[0] as any)?.[RAW_FIELD]).toBe(true);
        expect((items[1] as any)?.[RAW_FILE]).toBe(true);
      },
      { headers, body: stream }
    );
  });
});
