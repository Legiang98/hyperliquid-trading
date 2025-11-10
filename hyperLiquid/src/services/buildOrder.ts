import { TradingSignal, OrderRequest } from "../types";
import * as hl from "@nktkas/hyperliquid";

/**
 * Build order request from trading signal
 * Calculates position size based on fixed USD amount
 */
export async function buildOrder(signal: TradingSignal, context?: any): Promise<OrderRequest> {
    const fixedUsdAmount = parseFloat(process.env.FIX_STOPLOSS || "5");
    
    if (context) {
        context.log(`Building order with fixed USD amount: $${fixedUsdAmount}`);
    }


    let orderPrice: number;
    
    context.log(`Get signal: ${JSON.stringify(signal)}`);
    /**
     * Example signal format:
     * {
     *   "symbol": "BTC",
     *   "order": "buy", 
     *   "price": 101813,
     *   "signal": "entry",
     *   "stopLoss": 101600
     * }
     */
    const transport = new hl.HttpTransport({
        isTestnet: process.env.HYPERLIQUID_TESTNET === "true"
    });
    
    const infoClient = new hl.InfoClient({ transport });
    const allMids = await infoClient.allMids();
    const marketPrice = parseFloat(allMids[signal.symbol] || "0");
    
    if (!marketPrice) {
        throw new Error(`Unable to fetch market price for ${signal.symbol}`);
    }
    
    orderPrice = marketPrice;
    if (context) {
        context.log(`Fetched market price for ${signal.symbol}: ${marketPrice}`);
    }

    // Calculate position size based on fixed USD amount
    const size = fixedUsdAmount / Math.abs(orderPrice - signal.stopLoss);
    context.log(`Calculated size for ${signal.symbol}: ${size} (USD ${fixedUsdAmount} / Price ${orderPrice})`);
    
    if (context) {
        context.log(`Calculated size: ${size} ${signal.symbol} (${fixedUsdAmount} USD / ${orderPrice})`);
    }

    return {
        symbol: signal.symbol,
        order: signal.order,
        size: size,
        price: orderPrice,
        stopLoss: signal.stopLoss
    };
}
