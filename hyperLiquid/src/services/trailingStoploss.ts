import { WebhookPayload, OrderResult } from "../types";
import * as hl from "@nktkas/hyperliquid";
import { getEnvConfig, createClients, getAssetInfo, getPosition } from "../helpers/hyperliquid.helpers";
import { AppError } from "../helpers/errorHandler";
import { HTTP } from "../constants/http";

/**
 * Find existing stop loss order for the position
 * Stop loss orders are reduce-only orders on the opposite side of the position
 */
async function findStopLossOrder(
    infoClient: hl.InfoClient, 
    userAddress: string, 
    symbol: string, 
    isLong: boolean
) {
    const openOrders = await infoClient.openOrders({ user: userAddress as `0x${string}` });
    
    const stopLossOrder = openOrders.find(order => 
        order.coin === symbol && 
        order.reduceOnly === true &&
        ((isLong && order.side === "A") || (!isLong && order.side === "B"))
    );
    
    if (!stopLossOrder) {
        throw new AppError(`No stop loss order found for ${symbol}`, HTTP.BAD_REQUEST);
    }
    
    return stopLossOrder;
}

/**
 * Update trailing stop loss for an open position.
 * This modifies the existing stop loss order with a new trigger price.
 */
export async function updateStopLoss(
    signal: WebhookPayload,
    context?: any
): Promise<OrderResult> {
    try {
        // For UPDATE_STOP action, use stopLoss if provided, otherwise fall back to price
        const newStopPrice = signal.stopLoss || signal.price;
        
        if (!newStopPrice) {
            return { success: false, error: "Stop loss price is required (use stopLoss or price field)" };
        }

        const { privateKey, userAddress, isTestnet } = getEnvConfig();
        const { exchangeClient, infoClient } = createClients(privateKey, isTestnet);
        const { assetInfo, assetId } = await getAssetInfo(infoClient, signal.symbol);
        const { positionSize, isLong } = await getPosition(infoClient, userAddress, signal.symbol);
        const stopLossOrder = await findStopLossOrder(infoClient, userAddress, signal.symbol, isLong);

        const size = positionSize.toFixed(assetInfo.szDecimals);

        // Modify stop loss order with new trigger price
        await exchangeClient.batchModify({
            modifies: [{
                oid: stopLossOrder.oid,
                order: {
                    a: assetId,
                    b: !isLong, // Opposite of position direction
                    p: newStopPrice.toString(),
                    s: size,
                    r: true, // Reduce-only flag
                    t: {
                        trigger: {
                            isMarket: true,
                            triggerPx: newStopPrice.toString(),
                            tpsl: "sl" // Stop loss type
                        }
                    }
                }
            }]
        });

        return {
            success: true,
            message: `Updated trailing stop for ${signal.symbol} from ${stopLossOrder.limitPx} to ${newStopPrice}`
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}
