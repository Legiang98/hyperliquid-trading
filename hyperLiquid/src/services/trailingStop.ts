import { closeOrderRequest, OrderResult } from "../types";
import * as hl from "@nktkas/hyperliquid";

/**
 * Update trailing stop loss for an open position
 * This function modifies the stop loss order to trail the current price
 */
export async function trailingStoploss(
    signal: closeOrderRequest,
    context?: any
): Promise<OrderResult> {
    try {
        const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
        const userAddress = process.env.HYPERLIQUID_USER_ADDRESS;
        
        if (!privateKey) {
            throw new Error("HYPERLIQUID_PRIVATE_KEY not configured");
        }
        
        if (!userAddress) {
            throw new Error("HYPERLIQUID_USER_ADDRESS not configured");
        }

        const isTestnet = process.env.HYPERLIQUID_TESTNET === "true";
        const transport = new hl.HttpTransport({
            isTestnet
        });

        const exchangeClient = new hl.ExchangeClient({
            wallet: privateKey,
            transport
        });

        const infoClient = new hl.InfoClient({ transport });
        
        // Get asset metadata
        const meta = await infoClient.meta();
        const assetInfo = meta.universe.find(asset => asset.name === signal.symbol);
        if (!assetInfo) {
            throw new Error(`Asset ${signal.symbol} not found in metadata`);
        }
        
        const assetId = meta.universe.indexOf(assetInfo);

        console.log(`Updating trailing stop for ${signal.symbol}`);
        console.log('Signal:', signal);

        if (!signal.stopLoss) {
            return {
                success: false,
                error: "New stop loss price is required"
            };
        }

        // Get user's current position and open orders
        const userData = await infoClient.webData2({ user: userAddress as `0x${string}` });
        const position = userData.clearinghouseState.assetPositions.find(pos => pos.position.coin === signal.symbol);
        
        if (!position) {
            return {
                success: false,
                error: `No open position found for ${signal.symbol}`
            };
        }

        const positionSize = Math.abs(parseFloat(position.position.szi));
        const isLong = parseFloat(position.position.szi) > 0;
        
        console.log(`Position: ${isLong ? 'LONG' : 'SHORT'} ${positionSize} ${signal.symbol}`);
        console.log(`Updating stop loss to: ${signal.stopLoss}`);


        // Get all open orders to find existing stop loss order
        const openOrders = await infoClient.openOrders({ user: userAddress as `0x${string}` });
        
        // Find stop loss order for this symbol (reduce-only order on opposite side)
        const stopLossOrder = openOrders.find(order => 
            order.coin === signal.symbol && 
            order.reduceOnly === true &&
            ((isLong && order.side === "A") || (!isLong && order.side === "B"))
        );
        
        if (!stopLossOrder) {
            return {
                success: false,
                error: `No stop loss order found for ${signal.symbol}. Please ensure a stop loss order exists.`
            };
        }

        console.log(`Found stop loss order ID: ${stopLossOrder.oid}`);
        console.log(`Current stop price: ${stopLossOrder.limitPx}, New stop: ${signal.stopLoss}`);

        const szDecimals = assetInfo.szDecimals;
        const size = positionSize.toFixed(szDecimals);

        // Modify the stop loss order with new trigger price
        const modifyResult = await exchangeClient.batchModify({
            modifies: [{
                oid: stopLossOrder.oid,
                order: {
                    a: assetId,
                    b: !isLong, // Opposite of position direction
                    p: signal.stopLoss.toString(),
                    s: size,
                    r: true, // Reduce-only
                    t: {
                        trigger: {
                            isMarket: true,
                            triggerPx: signal.stopLoss.toString(),
                            tpsl: "sl"
                        }
                    }
                }
            }]
        });

        console.log("Modify result:", JSON.stringify(modifyResult));

        return {
            success: true,
            message: `Updated trailing stop for ${signal.symbol} from ${stopLossOrder.limitPx} to ${signal.stopLoss}`,
            orderId: JSON.stringify(modifyResult)
        };

    } catch (error) {
        console.error("Error closing position:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}
