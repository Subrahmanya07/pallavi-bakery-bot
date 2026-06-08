import test from "node:test";
import assert from "node:assert/strict";

test("getOrders uses the local admin proxy instead of calling the backend directly from the browser", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://192.168.0.12:8001";

  let requestedUrl = "";
  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ orders: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const { getOrders } = await import("./api.ts");
    await getOrders();
    assert.equal(requestedUrl, "/api/admin/orders");
  } finally {
    global.fetch = originalFetch;
  }
});
