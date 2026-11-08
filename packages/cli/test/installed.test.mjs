import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const executable = process.env.RELAY_TEST_BIN;
if (!executable) throw new Error("RELAY_TEST_BIN must point to an installed CLI entry point");

function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [executable, ...args], { env: { ...process.env, ...env } });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("installed CLI: help, credentials, requests, validation and API failures", async () => {
  const directory = await mkdtemp(join(tmpdir(), "relay-cli-test-"));
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ url: request.url, authorization: request.headers.authorization });
    response.setHeader("content-type", "application/json");
    if (request.url === "/api/v1/webhooks") {
      response.writeHead(401);
      response.end(JSON.stringify({ error: "Invalid key", code: "UNAUTHORIZED" }));
    } else response.end(JSON.stringify({ domains: [] }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const env = { RELAY_CONFIG_PATH: join(directory, "config.json"), RELAY_API_KEY: "", RELAY_API_URL: `http://127.0.0.1:${server.address().port}/api/v1` };
  try {
    const help = await run(["--help"], env);
    assert.equal(help.code, 0);
    assert.match(help.stdout, /Usage:/);
    const auth = await run(["auth", "rl_test_fixture"], env);
    assert.equal(auth.code, 0);
    assert.equal(JSON.parse(await readFile(env.RELAY_CONFIG_PATH, "utf8")).apiKey, "rl_test_fixture");
    const domains = await run(["domains"], env);
    assert.equal(domains.code, 0);
    assert.deepEqual(JSON.parse(domains.stdout), { domains: [] });
    assert.equal(requests[0].authorization, "Bearer rl_test_fixture");
    const failure = await run(["webhooks"], env);
    assert.equal(failure.code, 1);
    assert.match(failure.stderr, /Invalid key/);
    assert.doesNotMatch(failure.stderr, /SyntaxError|file:\/\//);
    const missing = await run(["message"], env);
    assert.equal(missing.code, 1);
    assert.match(missing.stderr, /inbox-id is required/);
    const unknown = await run(["not-a-command"], env);
    assert.equal(unknown.code, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
