#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { RelayApiError, RelayClient } from "@relaymcp/sdk";

const configPath = process.env.RELAY_CONFIG_PATH || join(homedir(), ".relay.json");
const command = process.argv[2];
const args = process.argv.slice(3);
const usage = `RelayMCP CLI - automate inboxes, messages, OTPs, and webhooks

Usage:
  relay auth <api-key>
  relay domains
  relay inboxes [cursor]
  relay inbox:create [name] [domain]
  relay messages <inbox-id> [limit] [cursor]
  relay message <inbox-id> <message-id>
  relay message:delete <inbox-id> <message-id>
  relay otp <inbox-id> <message-id>
  relay auth-artifacts <inbox-id> <message-id>
  relay webhooks
  relay webhook:add <https-url> [event ...]
  relay webhook:deliveries <webhook-id>
  relay webhook:delete <webhook-id>

Environment:
  RELAY_API_KEY   API key (overrides ~/.relay.json)
  RELAY_API_URL   API base URL for self-hosted installations
`;

const print = (value) => console.log(JSON.stringify(value, null, 2));
const fail = (message) => { console.error(`relay: ${message}`); process.exitCode = 1; };
const requireArg = (value, name) => { if (!value) throw new Error(`${name} is required. Use --help for usage.`); return value; };

try {
  if (!command || command === "help" || command === "--help" || command === "-h") { console.log(usage); process.exit(0); }
  if (command === "auth") {
    const apiKey = requireArg(args[0], "api-key");
    writeFileSync(configPath, JSON.stringify({ apiKey }, null, 2), { mode: 0o600 });
    print({ saved: true, path: configPath });
    process.exit(0);
  }
  const stored = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  const apiKey = process.env.RELAY_API_KEY || stored.apiKey;
  if (!apiKey) throw new Error("No API key found. Set RELAY_API_KEY or run `relay auth <api-key>`." );
  const client = new RelayClient({ apiKey, baseUrl: process.env.RELAY_API_URL });
  let result;
  switch (command) {
    case "domains": result = await client.listDomains(); break;
    case "inboxes": result = await client.listInboxes(args[0]); break;
    case "inbox:create": result = await client.createInbox({ name: args[0], domain: args[1] }); break;
    case "messages": result = await client.listMessages(requireArg(args[0], "inbox-id"), { limit: args[1] ? Number(args[1]) : undefined, cursor: args[2] }); break;
    case "message": result = await client.readMessage(requireArg(args[0], "inbox-id"), requireArg(args[1], "message-id")); break;
    case "message:delete": result = await client.deleteMessage(requireArg(args[0], "inbox-id"), requireArg(args[1], "message-id")); break;
    case "otp": result = await client.extractOtp(requireArg(args[0], "inbox-id"), requireArg(args[1], "message-id")); break;
    case "auth-artifacts": result = await client.extractAuth(requireArg(args[0], "inbox-id"), requireArg(args[1], "message-id")); break;
    case "webhooks": result = await client.listWebhooks(); break;
    case "webhook:add": result = await client.createWebhook(requireArg(args[0], "https-url"), args.slice(1)); break;
    case "webhook:deliveries": result = await client.listWebhookDeliveries(requireArg(args[0], "webhook-id")); break;
    case "webhook:delete": result = await client.deleteWebhook(requireArg(args[0], "webhook-id")); break;
    default: console.error(usage); process.exitCode = 1; process.exit();
  }
  print(result);
} catch (error) {
  if (error instanceof RelayApiError) fail(`${error.message}${error.body.code ? ` [${error.body.code}]` : ""}`);
  else fail(error instanceof Error ? error.message : String(error));
}
