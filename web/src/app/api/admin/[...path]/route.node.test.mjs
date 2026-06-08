import test from "node:test";
import assert from "node:assert/strict";

test("proxy backend candidates prefer local server URLs before browser-facing NEXT_PUBLIC_API_URL", async () => {
  delete process.env.ADMIN_API_URL;
  process.env.NEXT_PUBLIC_API_URL = "http://192.168.0.12:8001";

  const { getBackendBaseUrls } = await import("./backend.ts");
  const urls = getBackendBaseUrls();

  assert.deepEqual(urls.slice(0, 3), [
    "http://127.0.0.1:8001",
    "http://localhost:8001",
    "http://192.168.0.12:8001",
  ]);
});
