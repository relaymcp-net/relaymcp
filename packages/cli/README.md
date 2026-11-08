# @relaymcp/cli

The official command-line client for [RelayMCP](https://www.relaymcp.net): create disposable test inboxes, inspect messages, extract OTPs and authentication links, and manage signed webhooks from scripts or CI.

## Install

```sh
npm install --global @relaymcp/cli
relay --help
```

## Authenticate

```sh
relay auth rl_live_your_key
```

Or provide the key per invocation:

```sh
RELAY_API_KEY=rl_live_your_key relay inboxes
```

## Examples

```sh
relay domains
relay inboxes
relay inbox:create checkout-tests
relay messages inbox-id
relay message inbox-id message-id
relay otp inbox-id message-id
relay auth-artifacts inbox-id message-id
relay webhooks
relay webhook:add https://example.com/relay inbox.message.received
relay webhook:deliveries webhook-id
relay webhook:delete webhook-id
```

The CLI stores credentials in `~/.relay.json` with owner-only permissions. Prefer the `RELAY_API_KEY` environment variable in CI and automation.

Set `RELAY_API_URL` to target a self-hosted or local Relay instance.

## CI usage

The CLI prints machine-readable JSON to stdout and errors to stderr with a non-zero exit code:

```sh
RELAY_API_KEY="$RELAY_API_KEY" relay inboxes > inboxes.json
```

The API key is never printed by the CLI. Use a key with only the scopes required by the job.

## Commands

| Command | Scope | Purpose |
| --- | --- | --- |
| `domains` | `inboxes:read` | List available mail domains |
| `inboxes` | `inboxes:read` | List your inboxes |
| `inbox:create` | `inboxes:write` | Create an inbox |
| `messages` / `message` | `messages:read` | List or read messages |
| `otp` / `auth-artifacts` | `messages:read` | Extract verification artifacts |
| `message:delete` | `messages:delete` | Delete a message |
| `webhooks` / `webhook:deliveries` | `webhooks:read` | Inspect webhook state |
| `webhook:add` / `webhook:delete` | `webhooks:write` | Manage webhook endpoints |

## License

MIT. See `LICENSE`.
