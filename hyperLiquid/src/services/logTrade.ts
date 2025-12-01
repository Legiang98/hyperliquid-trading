import { WebhookPayload, OrderResult } from "../types";

/**
 * Log trade execution details
 * TODO: Integrate with Application Insights and Telegram
 */
export async function logTrade(
    signal: WebhookPayload,
    result: OrderResult,
    context?: any
): Promise<void> {
    const logEntry = {
        timestamp: new Date().toISOString(),
        symbol: signal.symbol,
        action: signal.action,
        type: signal.type,
        price: signal.price,
        stopLoss: signal.stopLoss,
        success: result.success,
        orderId: result.orderId,
        message: result.message,
        error: result.error
    };

    if (context) {
        context.log("Trade Log:", JSON.stringify(logEntry, null, 2));
    }

    // TODO: Send to Application Insights
    // TODO: Send to Telegram channel
    
    console.log("Trade executed:", logEntry);
}
