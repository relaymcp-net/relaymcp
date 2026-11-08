# RelayMCP Developer Packages

Official client packages for RelayMCP:

- [`@relaymcp/sdk`](./packages/sdk) — TypeScript/JavaScript SDK
- [`@relaymcp/cli`](./packages/cli) — command-line client
- [`relaymcp`](./packages/python) — Python client

## JavaScript SDK

```bash
npm install @relaymcp/sdk
```

```js
import { RelayClient } from "@relaymcp/sdk";

const relay = new RelayClient({
  apiKey: process.env.RELAY_API_KEY,
});

const { inboxes } = await relay.listInboxes();
console.log(inboxes);
```

## CLI

```bash
npm install -g @relaymcp/cli
relay --help
```

Set `RELAY_API_KEY` before using authenticated commands.

## Python

```bash
pip install relaymcp
```

```python
import os
from relaymcp import RelayClient

client = RelayClient(os.environ["RELAY_API_KEY"])
print(client.list_inboxes())
```

See each package README for installation details, API methods, authentication, and examples.

## API

The clients use the RelayMCP REST API at:

```text
https://www.relaymcp.net/api/v1
```

Create a scoped API key in your Relay account and keep it in an environment variable. Never commit credentials.

## License

MIT
