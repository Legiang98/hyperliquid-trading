import { OrderRequest, OrderResult, TradingSignal } from "../types";
import * as hl from "@nktkas/hyperliquid";

function roundPriceForAsset(price, szDecimals, isPerp = true) {
  const maxDecimals = isPerp ? 6 : 8;
  const allowedDecimals = Math.max(0, maxDecimals - szDecimals);
  const factor = Math.pow(10, allowedDecimals);
  return Math.round(price * factor) / factor;
}

/**
 * Execute order on HyperLiquid exchange
 */
export async function executeOrder(
    orderRequest: OrderRequest | null,
    signal?: TradingSignal,
    context?: any
): Promise<OrderResult> {
    try {
        const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("HYPERLIQUID_PRIVATE_KEY not configured");
        }

        const isTestnet = process.env.HYPERLIQUID_TESTNET === "true";
        const transport = new hl.HttpTransport({
            isTestnet
        });

        const exchangeClient = new hl.ExchangeClient({
            wallet: privateKey,
            transport
        });

        // Get asset metadata to find the asset ID and size decimals
        const infoClient = new hl.InfoClient({ transport });
        const meta = await infoClient.meta();
        const assetInfo = meta.universe.find(asset => asset.name === signal.symbol);
        if (!assetInfo) {
            throw new Error(`Asset ${signal.symbol} not found in metadata`);
        }
        
        const assetId = meta.universe.indexOf(assetInfo);
        context.log('Signal:', signal);

        if (!orderRequest) {
            throw new Error("Order request is required for entry signal");
        }

        if (context) {
            context.log(`Placing ${orderRequest.order} order for ${orderRequest.symbol}`);
        }

        const szDecimals = assetInfo.szDecimals;
        const size = orderRequest.size.toFixed(szDecimals);
        const orderResult = await exchangeClient.order({
            orders: [{
                a: assetId,
                b: orderRequest.order === "buy" ? true : false,
                p: orderRequest.price,
                s: size,
                r: false,
                t: { 
                    limit: { tif: "Gtc" },
                    // trigger: {
                    //     isMarket: true,
                    //     triggerPx: 0,    // maybe not needed
                    //     tpsl: null
                    // }
                }
            }],
            grouping: "na"
        });

        if (context) {
            context.log("Order result:", JSON.stringify(orderResult));
        }

        // STOPLOSS ORDER
        if (orderRequest.stopLoss) {
            const stopLossOrder = await exchangeClient.order({
                orders: [{
                    a: assetId,
                    b: orderRequest.order === "buy" ? false : true,
                    p: orderRequest.stopLoss.toString(),
                    s: size,
                    r: true,  
                    t: {
                        trigger: {
                            isMarket: true,
                            triggerPx: orderRequest.stopLoss.toString(),
                            tpsl: "sl"
                        }
                    }
                }],
                grouping: "na"
            });
        }

        return {
            success: true,
            message: "Order placed successfully",
            // orderId: JSON.stringify(orderResult)
        };

    } catch (error) {
        if (context) {
            context.error("Error executing order:", error);
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}
