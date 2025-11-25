import { TradingSignal, OrderRequest, AssetMeta } from "../types";
import * as hl from "@nktkas/hyperliquid";

function normalizeOrderSize(
    symbol: string,
    size: number,
    decimals: number 
): number {
    const factor = Math.pow(10, decimals);
    return Math.floor(size * factor) / factor;
}

/**
 * Normalize price for HyperLiquid orders
 * @param price The original price
 * @param szDecimals Size decimals of the asset
 * @returns Normalized price
 */
function normalizePrice(price: number, szDecimals: number): number {
    const MAX_DECIMALS = 6;

    const tickSize = Math.pow(10, -(MAX_DECIMALS - szDecimals));

    let normalized = Math.floor(price / tickSize) * tickSize;

    const hasDecimal = normalized % 1 !== 0;
    if (hasDecimal) {
        const digits = normalized.toString().replace('.', '').replace(/^0+/, '');
        if (digits.length > 5) {
            const factor = Math.pow(10, 5 - Math.floor(Math.log10(normalized)) - 1);
            normalized = Math.floor(normalized * factor) / factor;
        }
    }
    return normalized;
}



/**
 * Build order request from trading signal
 * Calculates position size based on fixed USD amount
 */
export async function buildOrder(signal: TradingSignal, context?: any): Promise<OrderRequest> {
    const fixedUsdAmount = parseFloat(process.env.FIX_STOPLOSS || "5");
    const transport = new hl.HttpTransport({
        isTestnet: process.env.HYPERLIQUID_TESTNET === "true"
    });
    const infoClient = new hl.InfoClient({ transport });
    
    const allMids = await infoClient.allMids();
    const marketPrice = parseFloat(allMids[signal.symbol] || "0");
    if (!marketPrice) {
        throw new Error(`Unable to fetch market price for ${signal.symbol}`);
    }

    // Fetch meta data (contains szDecimals for each symbol)
    const metaResponse = await infoClient.meta();
    const metaMap: Record<string, { szDecimals: number }> = {};

    for (const perp of metaResponse.universe) {
        metaMap[perp.name] = { szDecimals: perp.szDecimals };
        /** 
         * Example perp object:
        {
            "szDecimals": 0,
            "name": "SAND",
            "maxLeverage": 5,
            "marginTableId": 5
        },
         */
    }

    const szDecimalsSymbol = metaMap[signal.symbol]?.szDecimals;
    if (szDecimalsSymbol === undefined) {
        throw new Error(`Missing szDecimals for symbol ${signal.symbol}`);
    }


    const rawSize = fixedUsdAmount / Math.abs(marketPrice - signal.stopLoss);
    const normalizedSize = normalizeOrderSize(signal.symbol, rawSize, szDecimalsSymbol);
    const normalizedPrice = normalizePrice(marketPrice,szDecimalsSymbol);
    const normalizedStopLoss = normalizePrice(signal.stopLoss!, szDecimalsSymbol);

    context.log(`Normalized price for ${signal.symbol}: ${normalizedPrice}`);

    return {
        symbol: signal.symbol,
        order: signal.order,
        size: normalizedSize,       
        price: normalizedPrice,
        stopLoss: normalizedStopLoss
    };
}
