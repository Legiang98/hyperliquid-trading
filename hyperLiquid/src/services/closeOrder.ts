import { WebhookPayload, OrderResult } from "../types";
import * as hl from "@nktkas/hyperliquid";
import { findOpenOrder, closeAllOrders } from "../db/order.repository";
import { getEnvConfig, createClients, getAssetInfo, getPosition } from "../helpers/hyperliquid.helpers";
import { AppError } from "../helpers/errorHandler";
import { HTTP } from "../constants/http";

/**
 * Get current market price (best bid/ask) for near-market execution
 */
async function getMarketPrice(infoClient: hl.InfoClient, symbol: string, isSell: boolean): Promise<number> {
    const allMids = await infoClient.allMids();
    const marketPrice = parseFloat(allMids[symbol] || "0");
    
    console.log(`[closeOrder] Symbol: ${symbol}, Market price: ${marketPrice}`);
    
    if (!marketPrice || isNaN(marketPrice)) {
        throw new AppError(`Unable to fetch market price for ${symbol}`, HTTP.BAD_REQUEST);
    }
    
    // For sell orders, price slightly below mid; for buy orders, slightly above
    // This ensures quick execution while avoiding market order restrictions
    const priceAdjustment = isSell ? 0.999 : 1.001;
    return marketPrice * priceAdjustment;
}

/**
 * Cancel all open orders for a symbol (including stop loss)
 */
async function cancelOpenOrders(
    exchangeClient: hl.ExchangeClient,
    infoClient: hl.InfoClient,
    userAddress: string,
    symbol: string,
    assetId: number
): Promise<void> {
    const openOrders = await infoClient.openOrders({ user: userAddress as `0x${string}` });
    const ordersToCancel = openOrders.filter(order => order.coin === symbol);
    
    if (ordersToCancel.length > 0) {
        await exchangeClient.cancel({
            cancels: ordersToCancel.map(order => ({
                a: assetId,
                o: order.oid
            }))
        });
        console.log(`Cancelled ${ordersToCancel.length} open orders for ${symbol}`);
    }
}

/**
 * Close an open position by placing a limit order at near-market price
 * This is used for EXIT action to close positions
 */
export async function closeOrder(
    signal: WebhookPayload,
    context?: any
): Promise<OrderResult> {
    try {
        console.log(`[closeOrder] Received signal:`, JSON.stringify(signal, null, 2));
        
        const { privateKey, userAddress, isTestnet } = getEnvConfig();
        const { exchangeClient, infoClient } = createClients(privateKey, isTestnet);
        const { assetInfo, assetId } = await getAssetInfo(infoClient, signal.symbol);

        // Find open position from database
        const dbOrder = await findOpenOrder(signal.symbol, signal.strategy);
        if (!dbOrder) {
            return { success: false, error: `No open position found for ${signal.symbol}` };
        }

        // Get current position from HyperLiquid
        const { positionSize, isLong } = await getPosition(infoClient, userAddress, signal.symbol);
        const size = positionSize.toFixed(assetInfo.szDecimals);
        
        
        // Get near-market price for quick execution
        const closePrice = await getMarketPrice(infoClient, signal.symbol, isLong);
        
        // Format price according to HyperLiquid requirements (max 5 significant figures)
        const MAX_DECIMALS = 5;
        const pxDecimals = Math.max(0, MAX_DECIMALS - Math.floor(Math.log10(closePrice)) - 1);
        const formattedPrice = closePrice.toFixed(Math.min(pxDecimals, assetInfo.szDecimals));
        
        // Place closing order (opposite direction of position)
        const closeResponse = await exchangeClient.order({
            orders: [{
                a: assetId,
                b: !isLong, // Opposite of current position
                p: formattedPrice,
                s: size,
                r: true, // Reduce-only to ensure it only closes position
                t: { limit: { tif: "Gtc" } } // Good-til-cancel to ensure full position closure
            }],
            grouping: "na"
        });

        const orderStatus = closeResponse.response.data.statuses[0];
        if ('error' in orderStatus) {
            throw new AppError(`Failed to close position: ${orderStatus.error}`, HTTP.BAD_REQUEST);
        }

        // Cancel any remaining orders (stop loss, etc.)
        await cancelOpenOrders(exchangeClient, infoClient, userAddress, signal.symbol, assetId);

        // Calculate PnL (simplified - can be enhanced)
        const entryPrice = dbOrder.price;
        const pnl = isLong 
            ? (closePrice - entryPrice) * positionSize
            : (entryPrice - closePrice) * positionSize;

        // Update database - close ALL orders for this strategy (entry + stop loss)
        await closeAllOrders(signal.symbol, signal.strategy, pnl);

        return {
            success: true,
            message: `Closed ${signal.symbol} position`,
            orderId: dbOrder.oid || undefined
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}