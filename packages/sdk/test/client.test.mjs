import test from "node:test";
import assert from "node:assert/strict";
import { RelayApiError, RelayClient } from "../dist/index.js";

function mockFetch(responseBody, status = 200) {
  return async (url, init) => {
    assert.match(url, /\/inboxes$/);
    assert.equal(init.headers.Authorization, "Bearer rl_test");
    return new Response(JSON.stringify(responseBody), { status, headers: { "content-type": "application/json" } });
  };
}

test("creates a client and sends the API key as a bearer token", async () => {
  const client = new RelayClient({ apiKey: "rl_test", fetch: mockFetch({ inboxes: [], nextCursor: null }) });
  assert.deepEqual(await client.listInboxes(), { inboxes: [], nextCursor: null });
});

test("turns API failures into RelayApiError", async () => {
  const client = new RelayClient({ apiKey: "rl_test", fetch: mockFetch({ error: "Forbidden", code: "forbidden" }, 403) });
  await assert.rejects(() => client.listInboxes(), (error) => error instanceof RelayApiError && error.status === 403 && error.body.code === "forbidden");
});
