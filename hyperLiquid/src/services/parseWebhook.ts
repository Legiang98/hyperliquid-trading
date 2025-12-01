import { WebhookPayload } from "../types";

export function parseWebhook(payload: WebhookPayload): WebhookPayload {
    return {
        ...payload,
        symbol: payload.symbol.replace("USDT", "")
        // symbol: payload.symbol.replace("USDT", "").replace("USD", "")
    };
}
