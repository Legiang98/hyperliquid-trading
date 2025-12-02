import { WebhookPayload, ValidationResult } from "../types";
import * as hl from "@nktkas/hyperliquid";
import { InvocationContext } from "@azure/functions";

/**
 * Create a HyperLiquid InfoClient instance for API calls.
 */
function createInfoClient(): hl.InfoClient {
    return new hl.InfoClient({
        transport: new hl.HttpTransport({
            isTestnet: process.env.HYPERLIQUID_TESTNET === "true"
        })
    });
}

/**
 * Check if the user has an open position for the given symbol and strategy.
 * Validates by checking if order exists in both HyperLiquid API and database.
 */
async function hasOpenPosition(symbol: string, strategy: string, userAddress: string): Promise<boolean> {
    try {
        // Get HyperLiquid open orders for this symbol
        const infoClient = createInfoClient();
        const openOrders = await infoClient.openOrders({ user: userAddress as `0x${string}` });
        const symbolOrders = openOrders.filter(order => order.coin === symbol);
        
        if (symbolOrders.length === 0) {
            return false;
        }

        // Check if any of these orders exist in database with status='open'
        const { findOpenOrderByOid } = await import('../db/order.repository');
        
        for (const order of symbolOrders) {
            const dbOrder = await findOpenOrderByOid(symbol, order.oid.toString());
            if (dbOrder && dbOrder.strategy === strategy) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error("Error checking position:", error);
        return false;
    }
}

/**
 * Validate if the symbol exists on HyperLiquid.
 */
async function isValidSymbol(symbol: string): Promise<boolean> {
    const infoClient = createInfoClient();
    const meta = await infoClient.meta();
    return meta.universe.some(asset => asset.name === symbol);
}

/**
 * Validate stop loss logic:
 * - For BUY: stopLoss < price
 * - For SHORT: stopLoss > price
 */
function isValidStopLoss(payload: WebhookPayload): boolean {
    if (!payload.stopLoss) return false;
    const isBuy = payload.type === "BUY";
    return isBuy ? payload.stopLoss < payload.price : payload.stopLoss > payload.price;
}

/**
 * Check if the action is an entry action (BUY or SELL).
 */
function isEntryAction(action: string): boolean {
    return action === "ENTRY";
}

/**
 * Main signal validation function.
 * Checks symbol, stop loss, and position status.
 */
export async function validateSignal(
    payload: WebhookPayload,
    context?: InvocationContext
): Promise<ValidationResult> {
    try {
        // Symbol must exist
        if (!await isValidSymbol(payload.symbol)) {
            return { isValid: false, reason: `Invalid symbol: ${payload.symbol}` };
        }

        // If no user address, skip position checks
        const userAddress = process.env.HYPERLIQUID_USER_ADDRESS;
        if (!userAddress) {
            return { isValid: true };
        }

        // Check for open position (both in DB and on exchange)
        const hasPosition = await hasOpenPosition(payload.symbol, payload.strategy, userAddress);

        // Prevent duplicate entry for the same strategy
        if (isEntryAction(payload.action) && hasPosition) {
            return {
                isValid: false,
                skipped: true,
                reason: `Already have open position for ${payload.symbol} with strategy ${payload.strategy}`
            };
        }

        // Stop loss must be valid for entry actions
        if (isEntryAction(payload.action) && !isValidStopLoss(payload)) {
            return { isValid: false, reason: `Invalid stop loss for ${payload.symbol}` };
        }

        // Prevent exit if no position for this strategy
        if (payload.action === "EXIT" && !hasPosition) {
            return {
                isValid: false,
                skipped: true,
                reason: `No open position found for ${payload.symbol} with strategy ${payload.strategy}`
            };
        }

        // All checks passed
        return { isValid: true };

    } catch (error) {
        // Catch-all for unexpected errors
        return {
            isValid: false,
            reason: error instanceof Error ? error.message : "Validation error"
        };
    }
}