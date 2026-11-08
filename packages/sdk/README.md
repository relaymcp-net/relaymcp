# @relaymcp/sdk

The official TypeScript client for [RelayMCP](https://www.relaymcp.net), an API for programmatic email inboxes, message inspection, OTP and magic-link extraction, signed webhooks, and real-time events.

Built for browser automation, end-to-end tests, agent workflows, and backend services.

## Install

```sh
npm install @relaymcp/sdk
```

## Requirements

- Node.js 18 or newer
- A RelayMCP API key
- A runtime with `fetch` and Web Streams support (Node 18+, modern browsers, Bun, or Deno)

The package has no runtime dependencies.

## Create an inbox and read messages

```ts
import { RelayClient, RelayApiError } from "@relaymcp/sdk";

const relay = new RelayClient({
  apiKey: process.env.RELAY_API_KEY!,
});

try {
  const { inbox } = await relay.createInbox({ name: "checkout-tests" });
  console.log(`Waiting for mail at ${inbox.address}`);

  const page = await relay.listMessages(inbox.id, { limit: 20 });
  for (const message of page.messages) {
    console.log(message.subject, message.sender);
  }
} catch (error) {
  if (error instanceof RelayApiError) {
    console.error(error.status, error.body.code, error.message);
  }
  throw error;
}
```

## Extract an OTP or authentication link

```ts
const result = await relay.extractAuth(inboxId, messageId);

if (result.auth.otp.found && !result.auth.otp.ambiguous) {
  await page.locator("input[name=code]").fill(result.auth.otp.code!);
}

const verificationUrl = result.auth.links[0];
```

`extractOtp()` returns the OTP artifact only. `extractAuth()` returns both OTP information and links found in the message subject, text, and sanitized HTML.

## Webhooks

```ts
const created = await relay.createWebhook(
  "https://example.test/hooks/relay",
  ["inbox.message.received"]
);

// Store created.secret securely. It is shown only during creation.
console.log(created.id);

const deliveries = await relay.listWebhookDeliveries(created.id);
console.log(deliveries.deliveries);
```

Webhook requests include `x-relay-signature: t=<unix>,v1=<hmac>`. Verify the signature against `<unix>.<raw-json-body>` with the secret returned during creation.

## Real-time events

```ts
const controller = new AbortController();

await relay.streamEvents((event) => {
  if (event.type === "inbox.message.received") {
    console.log("New message", event.data);
  }
}, {
  reconnect: true,
  after: lastEventId,
  signal: controller.signal,
});

controller.abort();
```

When reconnecting, persist the last numeric event ID and pass it as `after` to avoid gaps.

## API surface

| Method | Description |
| --- | --- |
| `listDomains()` | List verified public domains |
| `listInboxes()` | List account-owned inboxes with cursor pagination |
| `createInbox()` | Create an inbox |
| `getInbox()` | Read inbox metadata |
| `listMessages()` | List message previews |
| `readMessage()` | Read a complete message |
| `deleteMessage()` | Delete a message when the key has permission |
| `extractOtp()` | Extract a one-time password |
| `extractAuth()` | Extract OTPs and authentication links |
| `listWebhooks()` | List webhook endpoints |
| `createWebhook()` | Create a signed webhook endpoint |
| `listWebhookDeliveries()` | Inspect delivery attempts |
| `deleteWebhook()` | Remove a webhook endpoint |
| `streamEvents()` | Consume the authenticated SSE event stream |

## Configuration

```ts
const relay = new RelayClient({
  apiKey: process.env.RELAY_API_KEY!,
  baseUrl: "https://www.relaymcp.net/api/v1",
});
```

`baseUrl` can point to a self-hosted RelayMCP API. A custom `fetch` implementation can be supplied for proxies, testing, or runtimes without a global `fetch`.

## Security

Keep API keys in server-side environment variables or a secret manager. Never send an API key to an untrusted browser bundle, commit one to source control, or log message contents and OTPs in production. Use the smallest API key scopes necessary for each service.

## License

MIT. See [LICENSE](./LICENSE).
