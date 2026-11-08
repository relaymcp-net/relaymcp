export type RelayErrorBody = {
    error?: string;
    code?: string;
    requestId?: string;
};
export type Inbox = {
    id: string;
    address: string;
    owned?: boolean;
    name?: string;
    domain?: string;
};
export type MessagePreview = {
    id: string;
    subject: string;
    sender: string;
    created: number;
    preview: string;
};
export type OtpArtifact = {
    found: boolean;
    ambiguous: boolean;
    code: string | null;
    confidence: string;
};
export type AuthArtifacts = {
    otp: OtpArtifact;
    links: string[];
};
export type RelayClientOptions = {
    apiKey: string;
    baseUrl?: string;
    fetch?: typeof globalThis.fetch;
};
export type RelayEvent = {
    id?: number;
    type: string;
    data: unknown;
};
export type Webhook = {
    id: string;
    url: string;
    events: string[];
    active?: boolean;
    created?: number;
};
export type WebhookDelivery = {
    id: string;
    eventId?: number;
    status: string;
    attempts: number;
    responseStatus?: number;
    created?: number;
    deliveredAt?: number;
};
export type Message = MessagePreview & {
    body?: string;
    html?: string;
    attachments?: Array<{
        id: string;
        filename: string;
        contentType: string;
        size: number;
    }>;
};
export declare class RelayApiError extends Error {
    readonly status: number;
    readonly body: RelayErrorBody;
    readonly name = "RelayApiError";
    constructor(status: number, body: RelayErrorBody);
}
export declare class RelayClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly request;
    constructor(options: RelayClientOptions);
    private call;
    listDomains(): Promise<{
        domains: unknown[];
    }>;
    listInboxes(cursor?: string): Promise<{
        inboxes: Inbox[];
        nextCursor: string | null;
    }>;
    createInbox(input?: {
        name?: string;
        domain?: string;
    }): Promise<{
        inbox: Inbox;
    }>;
    getInbox(id: string): Promise<{
        inbox: Inbox;
    }>;
    listMessages(id: string, options?: {
        cursor?: string;
        limit?: number;
    }): Promise<{
        messages: MessagePreview[];
        nextCursor: string | null;
    }>;
    readMessage(inboxId: string, messageId: string): Promise<Record<string, unknown>>;
    deleteMessage(inboxId: string, messageId: string): Promise<{
        deleted: true;
    }>;
    extractOtp(inboxId: string, messageId: string): Promise<{
        otp: OtpArtifact;
    }>;
    extractAuth(inboxId: string, messageId: string): Promise<{
        auth: AuthArtifacts;
    }>;
    listWebhooks(): Promise<{
        webhooks: Webhook[];
    }>;
    createWebhook(url: string, events?: string[]): Promise<{
        id: string;
        secret: string;
    }>;
    deleteWebhook(id: string): Promise<{
        deleted: true;
    }>;
    listWebhookDeliveries(id: string): Promise<{
        deliveries: WebhookDelivery[];
    }>;
    streamEvents(onEvent: (event: RelayEvent) => void, options?: {
        after?: number;
        signal?: AbortSignal;
        reconnect?: boolean;
        reconnectDelayMs?: number;
    }): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map