export class RelayApiError extends Error {
    status;
    body;
    name = "RelayApiError";
    constructor(status, body) {
        super(body.error || `Relay request failed (${status})`);
        this.status = status;
        this.body = body;
    }
}
export class RelayClient {
    baseUrl;
    apiKey;
    request;
    constructor(options) {
        if (!options.apiKey?.trim())
            throw new TypeError("apiKey is required");
        this.baseUrl = (options.baseUrl || "https://www.relaymcp.net/api/v1").replace(/\/$/, "");
        this.apiKey = options.apiKey;
        this.request = options.fetch || globalThis.fetch;
        if (!this.request)
            throw new Error("This runtime does not provide fetch; pass options.fetch");
    }
    async call(path, init = {}) {
        const response = await this.request(`${this.baseUrl}${path}`, {
            ...init,
            headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers }
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok)
            throw new RelayApiError(response.status, body);
        return body;
    }
    listDomains() { return this.call("/domains"); }
    listInboxes(cursor) { return this.call(`/inboxes${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`); }
    createInbox(input = {}) { return this.call("/inboxes", { method: "POST", body: JSON.stringify(input) }); }
    getInbox(id) { return this.call(`/inboxes/${encodeURIComponent(id)}`); }
    listMessages(id, options = {}) { const query = new URLSearchParams(); if (options.cursor)
        query.set("cursor", options.cursor); if (options.limit)
        query.set("limit", String(options.limit)); return this.call(`/inboxes/${encodeURIComponent(id)}/messages${query.size ? `?${query}` : ""}`); }
    readMessage(inboxId, messageId) { return this.call(`/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`); }
    deleteMessage(inboxId, messageId) { return this.call(`/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`, { method: "DELETE" }); }
    extractOtp(inboxId, messageId) { return this.call(`/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/otp`); }
    extractAuth(inboxId, messageId) { return this.call(`/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/auth`); }
    listWebhooks() { return this.call("/webhooks"); }
    createWebhook(url, events) { return this.call("/webhooks", { method: "POST", body: JSON.stringify({ url, events }) }); }
    deleteWebhook(id) { return this.call(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" }); }
    listWebhookDeliveries(id) { return this.call(`/webhooks/${encodeURIComponent(id)}`); }
    async streamEvents(onEvent, options = {}) {
        let cursor = options.after || 0;
        do {
            const response = await this.request(`${this.baseUrl}/events?after=${cursor}`, { headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "text/event-stream" }, signal: options.signal });
            if (!response.ok || !response.body)
                throw new RelayApiError(response.status, await response.json().catch(() => ({})));
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (!options.signal?.aborted) {
                const part = await reader.read();
                if (part.done)
                    break;
                buffer += decoder.decode(part.value, { stream: true });
                const chunks = buffer.split("\n\n");
                buffer = chunks.pop() || "";
                for (const chunk of chunks) {
                    const id = chunk.match(/^id: (\d+)/m)?.[1];
                    const type = chunk.match(/^event: (.+)$/m)?.[1] || "message";
                    const data = chunk.match(/^data: (.+)$/m)?.[1];
                    if (data) {
                        onEvent({ id: id ? Number(id) : undefined, type, data: JSON.parse(data) });
                        if (id)
                            cursor = Number(id);
                    }
                }
            }
            if (!options.reconnect || options.signal?.aborted)
                break;
            await new Promise((resolve) => setTimeout(resolve, options.reconnectDelayMs ?? 1000));
        } while (!options.signal?.aborted);
    }
}
//# sourceMappingURL=index.js.map