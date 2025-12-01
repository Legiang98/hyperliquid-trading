import { OrderResult, WebhookPayload } from "../types";
import * as hl from "@nktkas/hyperliquid";
import { insertOrder, updateOrderOid } from "../db/order.repository";
import { getEnvConfig, createClients, getAssetInfo } from "../helpers/hyperliquid.helpers";
import { AppError } from "../helpers/errorHandler";
import { HTTP } from "../constants/http";
import { sendTelegramMessage } from "../helpers/telegram";

function extractOrderId(status: any): number {
    if (!status) throw new AppError("Order status is missing", HTTP.BAD_REQUEST);

    if (status.resting?.oid) return status.resting.oid;
    if (status.filled?.oid) return status.filled.oid;

    throw new AppError("Order ID not found in response", HTTP.BAD_REQUEST);
}

/**
 * Execute order on HyperLiquid exchange
 */
export async function executeOrder(
    signal: WebhookPayload,
    context?: any
): Promise<OrderResult> {
    try {
        if (!signal.quantity) {
            throw new AppError("Quantity is required. Did you call buildOrder first?", HTTP.BAD_REQUEST);
        }

        const { privateKey, userAddress, isTestnet } = getEnvConfig();
        const { exchangeClient, infoClient } = createClients(privateKey, isTestnet);
        const { assetInfo, assetId } = await getAssetInfo(infoClient, signal.symbol);

        const szDecimals = assetInfo.szDecimals;
        const size = signal.quantity.toFixed(szDecimals);
        const isBuy = signal.type === "BUY";

        // Place main order
        const orderResponse = await exchangeClient.order({
            orders: [{
                a: assetId,
                b: isBuy,
                p: signal.price.toString(),
                s: size,
                r: false,
                t: { limit: { tif: "Gtc" } }
            }],
            grouping: "na"
        });

        const orderStatus = orderResponse.response.data.statuses[0];
        const orderId = extractOrderId(orderStatus);
        console.log(`Order placed with ID: ${orderId}`);

        // Insert order into database
        const dbOrder = await insertOrder({
            user_address: userAddress,
            symbol: signal.symbol,
            strategy: signal.strategy,
            quantity: signal.quantity,
            order_type: signal.type,
            action: signal.action,
            price: signal.price,
            oid: orderId.toString(),
            status: "open"
        });

        // Place stop loss order if specified
        if (signal.stopLoss) {
            const stopLossResponse = await exchangeClient.order({
                orders: [{
                    a: assetId,
                    b: !isBuy,
                    p: signal.stopLoss.toString(),
                    s: size,
                    r: true,
                    t: {
                        trigger: {
                            isMarket: true,
                            triggerPx: signal.stopLoss.toString(),
                            tpsl: "sl"
                        }
                    }
                }],
                grouping: "na"
            });

            const stopLossStatus = stopLossResponse.response.data.statuses[0];
            const stopLossOid = extractOrderId(stopLossStatus);
            
            // Insert stop loss order into database
            await insertOrder({
                user_address: userAddress,
                symbol: signal.symbol,
                strategy: signal.strategy,
                quantity: signal.quantity,
                order_type: "STOP_MARKET",
                action: "EXIT",
                price: signal.stopLoss,
                oid: stopLossOid.toString(),
                status: "open"
            });
            
            console.log(`Stop loss placed with ID: ${stopLossOid}`);
        }

        // Send Telegram notification
        try {
            const chatId = process.env.TELEGRAM_CHAT_ID;
            const token = process.env.TELEGRAM_BOT_TOKEN;

            if (chatId && token) {
                const action = isBuy ? "🟢 BUY" : "🔴 SELL";
                const message = `✅ *Order Executed*\n${action} ${signal.symbol} @ ${signal.price}${signal.stopLoss ? `\nSL: ${signal.stopLoss}` : ""}`;
                await sendTelegramMessage(chatId, token, message);
            }
        } catch (err) {
            console.error("Failed to send Telegram notification:", err);
        }

        return {
            success: true,
            message: `Order placed successfully for ${signal.symbol}`,
            orderId: orderId.toString(),
            dbOrderId: dbOrder.id
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}
