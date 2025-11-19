import { WebhookPayload, TradingSignal } from "../types";

/**
 * Parse incoming webhook payload and extract trading signal
 */
export async function parseWebhook(payload: WebhookPayload): Promise<TradingSignal | null> {
    try {
        if (payload.pair && payload.action) {
            const symbol = payload.pair.replace("USDT", "").replace("USD", "");
            let order: "buy" | "sell";
            let signal: "entry" | "exit" | "update_stop";

            const action = payload.action.toUpperCase();
            
            if (action === "BUY" || action === "LONG") {
                order = "buy";
                signal = "entry";
            } else if (action === "SELL" || action === "SHORT") {
                order = "sell";
                signal = "entry";
            } else if (action === "EXIT") {
                signal = "exit";
                if (payload.position === "BUY") {
                    order = "buy";
                } else if (payload.position === "SELL") {
                    order = "sell";
                } else {
                    return null; 
                }
            } else if (action === "UPDATE_STOP") {
                order = payload.position === "LONG" ? "sell" : "buy";
                signal = "update_stop";
            } else {
                return null;
            }

            return {
                symbol,
                order,
                price: payload.entry,
                signal,
                stopLoss: payload.stopLoss,
            };
        }
    } catch (error) {
        throw new Error("Something went wrong");
        // context.error("Error parsing webhook:", error);
        return null;
    }
}
