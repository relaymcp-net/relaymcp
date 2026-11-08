export type RelayErrorBody = { error?: string; code?: string; requestId?: string };
export type Inbox = { id: string; address: string; owned?: boolean; name?: string; domain?: string };
export type MessagePreview = { id: string; subject: string; sender: string; created: number; preview: string };
export type OtpArtifact = { found: boolean; ambiguous: boolean; code: string | null; confidence: string };
export type AuthArtifacts = { otp: OtpArtifact; links: string[] };
export type RelayClientOptions = { apiKey: string; baseUrl?: string; fetch?: typeof globalThis.fetch };
export type RelayEvent = { id?: number; type: string; data: unknown };
export type Webhook = { id: string; url: string; events: string[]; active?: boolean; created?: number };
export type WebhookDelivery = { id: string; eventId?: number; status: string; attempts: number; responseStatus?: number; created?: number; deliveredAt?: number };
export type Message = MessagePreview & { body?: string; html?: string; attachments?: Array<{ id: string; filename: string; contentType: string; size: number }> };

export class RelayApiError extends Error {
  readonly name = "RelayApiError";
  constructor(public readonly status: number, public readonly body: RelayErrorBody) {
    super(body.error || `Relay request failed (${status})`);
  }
}

export class RelayClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly request: typeof globalThis.fetch;

  constructor(options: RelayClientOptions) {
    if (!options.apiKey?.trim()) throw new TypeError("apiKey is required");
    this.baseUrl = (options.baseUrl || "https://www.relaymcp.net/api/v1").replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.request = options.fetch || globalThis.fetch;
    if (!this.request) throw new Error("This runtime does not provide fetch; pass options.fetch");
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.request(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new RelayApiError(response.status, body);
    return body as T;
  }

  listDomains() { return this.call<{ domains: unknown[] }>("/domains"); }
  listInboxes(cursor?: string) { return this.call<{ inboxes: Inbox[]; nextCursor: string | null }>(`/inboxes${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`); }
  createInbox(input: { name?: string; domain?: string } = {}) { return this.call<{ inbox: Inbox }>("/inboxes", { method: "POST", body: JSON.stringify(input) }); }
  getInbox(id: string) { return this.call<{ inbox: Inbox }>(`/inboxes/${encodeURIComponent(id)}`); }
  listMessages(id: string, options: { cursor?: string; limit?: number } = {}) { const query = new URLSearchParams(); if (options.cursor) query.set("cursor", options.cursor); if (options.limit) query.set("limit", String(options.limit)); return this.call<{ messages: MessagePreview[]; nextCursor: string | null }>(`/inboxes/${encodeURIComponent(id)}/messages${query.size ? `?${query}` : ""}`); }
  readMessage(inboxId: string, messageId: string) { return this.call<Record<string, unknown>>(`/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`); }
  deleteMessage(inboxId: string, messageId: string) { return this.call<{ deleted: true }>(`/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`, { method: "DELETE" }); }
  extractOtp(inboxId: string, messageId: string) { return this.call<{ otp: OtpArtifact }>(`/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/otp`); }
  extractAuth(inboxId: string, messageId: string) { return this.call<{ auth: AuthArtifacts }>(`/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/auth`); }
  listWebhooks() { return this.call<{ webhooks: Webhook[] }>("/webhooks"); }
  createWebhook(url: string, events?: string[]) { return this.call<{ id: string; secret: string }>("/webhooks", { method: "POST", body: JSON.stringify({ url, events }) }); }
  deleteWebhook(id: string) { return this.call<{ deleted: true }>(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  listWebhookDeliveries(id: string) { return this.call<{ deliveries: WebhookDelivery[] }>(`/webhooks/${encodeURIComponent(id)}`); }

  async streamEvents(onEvent: (event: RelayEvent) => void, options: { after?: number; signal?: AbortSignal; reconnect?: boolean; reconnectDelayMs?: number } = {}) {
    let cursor = options.after || 0;
    do {
      const response = await this.request(`${this.baseUrl}/events?after=${cursor}`, { headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "text/event-stream" }, signal: options.signal });
      if (!response.ok || !response.body) throw new RelayApiError(response.status, await response.json().catch(() => ({})));
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (!options.signal?.aborted) {
        const part = await reader.read(); if (part.done) break; buffer += decoder.decode(part.value, { stream: true });
        const chunks = buffer.split("\n\n"); buffer = chunks.pop() || "";
        for (const chunk of chunks) { const id = chunk.match(/^id: (\d+)/m)?.[1]; const type = chunk.match(/^event: (.+)$/m)?.[1] || "message"; const data = chunk.match(/^data: (.+)$/m)?.[1]; if (data) { onEvent({ id: id ? Number(id) : undefined, type, data: JSON.parse(data) }); if (id) cursor = Number(id); } }
      }
      if (!options.reconnect || options.signal?.aborted) break;
      await new Promise((resolve) => setTimeout(resolve, options.reconnectDelayMs ?? 1000));
    } while (!options.signal?.aborted);
  }
}
