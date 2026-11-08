# relaymcp-client

Official Python client for [RelayMCP](https://www.relaymcp.net), a programmable email inbox API for end-to-end tests, browser automation, agent workflows, and backend services.

## Install

```sh
python -m pip install relaymcp-client
```

The package has no runtime dependencies and supports Python 3.9+.

## Quick start

```python
import os
from relaymcp import RelayApiError, RelayClient

relay = RelayClient(os.environ["RELAY_API_KEY"])
inbox = relay.create_inbox(name="checkout-tests")["inbox"]
print(inbox["address"])

messages = relay.list_messages(inbox["id"], limit=20)
for message in messages["messages"]:
    print(message["subject"], message["sender"])
```

## OTP and authentication links

```python
artifacts = relay.extract_auth(inbox_id, message_id)["auth"]

if artifacts["otp"]["found"] and not artifacts["otp"]["ambiguous"]:
    verification_code = artifacts["otp"]["code"]

verification_url = artifacts["links"][0] if artifacts["links"] else None
```

## Webhooks

```python
created = relay.create_webhook(
    "https://example.test/hooks/relay",
    ["inbox.message.received"],
)

# Store this secret securely. It is returned only during creation.
print(created["id"])
print(relay.list_webhook_deliveries(created["id"]))
```

Webhook requests include `x-relay-signature: t=<unix>,v1=<hmac>`. Verify the HMAC against `<unix>.<raw-json-body>` using the secret returned by `create_webhook`.

## Real-time events

```python
def handle_event(event):
    if event["type"] == "inbox.message.received":
        print("New message", event["data"])

relay.stream_events(handle_event, after=last_event_id)
```

## Error handling

```python
try:
    relay.list_inboxes()
except RelayApiError as error:
    print(error.status, error.body.get("code"), str(error))
```

`RelayApiError` contains the HTTP status and structured API response. Network and transport failures raise `RelayError`.

## Self-hosted API

```python
relay = RelayClient(
    os.environ["RELAY_API_KEY"],
    base_url="https://relay.example.com/api/v1",
    timeout=30,
)
```

## Security

Keep API keys in environment variables or a secret manager. Do not commit them, log message bodies, or expose them to untrusted browser code. Use the smallest API key scopes required by each service.

## License

MIT. See [LICENSE](./LICENSE).
