import * as hl from "@nktkas/hyperliquid";
import { AppError } from "../helpers/errorHandler";
import { HTTP } from "../constants/http";

/**
 * Get environment configuration for HyperLiquid
 */
export function getEnvConfig() {
    const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
    const userAddress = process.env.HYPERLIQUID_USER_ADDRESS;
    const isTestnet = process.env.HYPERLIQUID_TESTNET === "true";

    if (!privateKey) throw new Error("HYPERLIQUID_PRIVATE_KEY not configured");
    if (!userAddress) throw new Error("HYPERLIQUID_USER_ADDRESS not configured");

    return { privateKey, userAddress, isTestnet };
}

/**
 * Create HyperLiquid API clients
 */
export function createClients(privateKey: string, isTestnet: boolean) {
    const transport = new hl.HttpTransport({ isTestnet });
    return {
        exchangeClient: new hl.ExchangeClient({ wallet: privateKey, transport }),
        infoClient: new hl.InfoClient({ transport })
    };
}

/**
 * Get asset metadata from HyperLiquid
 */
export async function getAssetInfo(infoClient: hl.InfoClient, symbol: string) {
    const meta = await infoClient.meta();
    const assetInfo = meta.universe.find(asset => asset.name === symbol);
    
    if (!assetInfo) {
        throw new AppError(`Asset ${symbol} not found`, HTTP.BAD_REQUEST);
    }
    
    return {
        assetInfo,
        assetId: meta.universe.indexOf(assetInfo)
    };
}

/**
 * Get user's current position for a symbol
 */
export async function getPosition(infoClient: hl.InfoClient, userAddress: string, symbol: string) {
    const userData = await infoClient.webData2({ user: userAddress as `0x${string}` });
    const position = userData.clearinghouseState.assetPositions.find(
        pos => pos.position.coin === symbol
    );
    
    if (!position) {
        throw new AppError(`No open position found for ${symbol}`, HTTP.BAD_REQUEST);
    }

    const positionSize = Math.abs(parseFloat(position.position.szi));
    const isLong = parseFloat(position.position.szi) > 0;
    
    return { positionSize, isLong };
}
