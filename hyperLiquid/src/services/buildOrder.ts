import { WebhookPayload, AssetMeta } from "../types";
import * as hl from "@nktkas/hyperliquid";
import { AppError } from "../helpers/errorHandler";
import { HTTP } from "../constants/http";

/**
 * Normalize order size for HyperLiquid orders
 * @param symbol The trading symbol
 * @param size The original size
 * @param decimals Number of decimal places supported by the exchange for this asset
 * @returns Normalized size
 */
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
 * This part is for verifying the price with commas and ensuring it fits exchange requirements 
 * e.g: 3480.2567  ->  3480.25
 */
function normalizePrice(price: number, szDecimals: number): number {
    /** 
     * MAX_DECIMALS defines the maximum decimal places supported by HyperLiquid 
     * Example: If szDecimals = 2, MAX_DECIMALS - szDecimals = 4, so tickSize = 0.0001
     */

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
* Validate the stop loss price with liquidation price
*/
function validateStoploss(
    order: "buy" | "sell",
    price: number,
    currentLeverage: number,
    positionSize: number,
    stopLossPrice: number,
): boolean {
    const margin = (price * positionSize) / currentLeverage;
    if (order === "buy") {
        const liquidationPrice = price - (margin / positionSize);
        return stopLossPrice > liquidationPrice;
    } else {
        const liquidationPrice = price + (margin / positionSize);
        return stopLossPrice < liquidationPrice;
    }
}



/**
 * Build order request from trading signal
 * Calculates position size based on fixed USD amount
 * Returns enriched WebhookPayload with quantity and normalized prices
 */
export async function buildOrder(signal: WebhookPayload, context?: any): Promise<WebhookPayload> {
    
    /*
    * Input for the buildOrder function
    */
    const fixedUsdAmount = parseFloat(process.env.FIX_STOPLOSS || "5");
    const userAddress = process.env.HYPERLIQUID_USER_ADDRESS;
    
    if (!userAddress) {
        throw new AppError("HYPERLIQUID_USER_ADDRESS not configured", HTTP.INTERNAL_SERVER_ERROR);
    }
    
    /*
    * Initialize connection and info client
    */
    const transport = new hl.HttpTransport({
        isTestnet: process.env.HYPERLIQUID_TESTNET === "true"
    });
    const infoClient = new hl.InfoClient({ transport });
    
    /* Get all pairs and their prices */
    const allMids = await infoClient.allMids();
    const marketPrice = parseFloat(allMids[signal.symbol] || "0");
    
    if (!marketPrice) {
        throw new AppError(`Unable to fetch market price for ${signal.symbol}`, HTTP.BAD_REQUEST);
    }
    
    /* Get leverage information for the current symbol */
    const assetData = await infoClient.activeAssetData({ 
        user: userAddress as `0x${string}`,
        coin: signal.symbol 
    });

    /*
    *  e.g; Leverage for BTC: { type: 'isolated', value: 8, rawUsd: '-207.59043' }
    */
    const leverage = assetData.leverage;
    const exchangeClient = new hl.ExchangeClient({
        wallet: process.env.HYPERLIQUID_PRIVATE_KEY!,
        transport
    });

    /* Switch to isolated mode if current leverage is cross */
    if (leverage.type == "cross") {
        await exchangeClient.updateLeverage({
            isCross: false,
            asset: signal.symbol,
            leverage: leverage.value
        });
    }
    
    /**
    * Fetch meta data (contains szDecimals for each symbol) 
    * for round the prices
    */
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
        throw new AppError(`Missing szDecimals for symbol ${signal.symbol}`, HTTP.BAD_REQUEST);
    }
    const rawSize = fixedUsdAmount / Math.abs(marketPrice - signal.stopLoss!);
    const normalizedQuantity = normalizeOrderSize(signal.symbol, rawSize, szDecimalsSymbol);
    const normalizedPrice = normalizePrice(marketPrice,szDecimalsSymbol);
    const normalizedStopLoss = normalizePrice(signal.stopLoss!, szDecimalsSymbol);

    /*
    * Validate stop loss with liquidation price
    */
    const order: "buy" | "sell" = signal.type === "BUY" ? "buy" : "sell";
    const isStoplossValid = validateStoploss(
        order,
        marketPrice,
        leverage.value,
        normalizedQuantity,
        signal.stopLoss!
    );

    if (!isStoplossValid) {
        throw new AppError(`Invalid stop loss price ${signal.stopLoss} for ${signal.symbol} with current leverage ${leverage.value}`, HTTP.BAD_REQUEST);
    }

    // Return enriched WebhookPayload with calculated quantity and normalized prices
    return {
        ...signal,
        quantity: normalizedQuantity,
        price: normalizedPrice,
        stopLoss: normalizedStopLoss
    };
}
