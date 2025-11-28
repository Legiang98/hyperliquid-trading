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
 * This part is for verifying the price with commas and ensuring it fits exchange requirements 
 * e.g: 3480.2567  ->  3480.25
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

/*
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
 */
export async function buildOrder(signal: TradingSignal, context?: any): Promise<OrderRequest> {
    
    /*
    * Input for the buildOrder function
    */
    const fixedUsdAmount = parseFloat(process.env.FIX_STOPLOSS || "5");
    const userAddress = process.env.HYPERLIQUID_USER_ADDRESS;
    
    if (!userAddress) {
        throw new Error("HYPERLIQUID_USER_ADDRESS not configured");
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
        throw new Error(`Unable to fetch market price for ${signal.symbol}`);
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
    
    /* 
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
        throw new Error(`Missing szDecimals for symbol ${signal.symbol}`);
    }
    const rawSize = fixedUsdAmount / Math.abs(marketPrice - signal.stopLoss);
    const normalizedQuantity = normalizeOrderSize(signal.symbol, rawSize, szDecimalsSymbol);
    const normalizedPrice = normalizePrice(marketPrice,szDecimalsSymbol);
    const normalizedStopLoss = normalizePrice(signal.stopLoss!, szDecimalsSymbol);

    /*
    * Validate stop loss with liquidation price
    */
    const isStoplossValid = validateStoploss(
        signal.order,
        marketPrice,
        leverage.value,
        normalizedQuantity,
        signal.stopLoss!
    );

    if (!isStoplossValid) {
        throw new Error(`Invalid stop loss price ${signal.stopLoss} for ${signal.symbol} with current leverage ${leverage.value}`);
    }

    return {
        symbol: signal.symbol,
        order: signal.order,
        quantity: normalizedQuantity,       
        price: normalizedPrice,
        stopLoss: normalizedStopLoss
    };
}
