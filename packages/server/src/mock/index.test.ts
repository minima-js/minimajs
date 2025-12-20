import { mockApp, mockRoute } from "./index.js";

describe("mockApp", () => {
  test("should handle valid JSON response", async () => {
    const [res] = await mockApp(mockRoute(() => ({ key: "value" })));
    expect(res!.statusCode).toBe(200);
    expect(res!.body).toEqual({ key: "value" });
  });

  test("should handle non-JSON response", async () => {
    const [res] = await mockApp(mockRoute(() => "plain text", { headers: { "content-type": "text/plain" } }));
    expect(res!.statusCode).toBe(200);
    expect(res!.body).toBe("plain text");
  });

  test("should handle parsing error for invalid JSON with json content-type", async () => {
    const [res] = await mockApp(
      mockRoute(() => "this is not json", { headers: { "content-type": "application/json" } })
    );
    expect(res!.statusCode).toBe(200);
    // The body should remain the original payload if JSON.parse fails
    expect(res!.body).toBe("this is not json");
  });
});
