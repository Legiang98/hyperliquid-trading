import { TradingSignal, ValidationResult } from "../types";
import * as hl from "@nktkas/hyperliquid";
import { InvocationContext } from "@azure/functions";

async function checkExistingPosition(
    signal: { signal: string; symbol: string },
    userAddress: string,
    context?: InvocationContext
): Promise<boolean> {
    const infoClient = new hl.InfoClient({
        transport: new hl.HttpTransport({
            isTestnet: process.env.HYPERLIQUID_TESTNET === "true"
        }),
    });

    try {
        const openOrders = await infoClient.openOrders({ user: userAddress });

        const hasOpenPosition = openOrders.some(
            (order: any) => order.coin === signal.symbol
        );

        return hasOpenPosition;

    } catch (err) {
        context?.log(`Error checking existing position: ${(err as Error).message}`);
        return false;
    }
}

async function validateSymbol(
    signal: TradingSignal,
    context?: InvocationContext
): Promise<boolean> {
    const transport = new hl.HttpTransport({
        isTestnet: process.env.HYPERLIQUID_TESTNET === "true"
    });

    const infoClient = new hl.InfoClient({ transport });
    const meta = await infoClient.meta();
    const symbolExists = meta.universe.some(asset => asset.name === signal.symbol);

    if (context) {
        context.log(`Symbol ${signal.symbol} existence: ${symbolExists}`);
    }

    return symbolExists;
}

async function validateStopLoss(
    signal: TradingSignal,
    context?: InvocationContext
): Promise<boolean> {
    context?.log(`Validating stop loss for ${signal.symbol}: price=${signal.price}, stopLoss=${signal.stopLoss}, order=${signal.order}`);
    if (signal.stopLoss === undefined) {
        return false;
    }

    if (signal.order === "buy" && signal.stopLoss >= signal.price) {
        return false;
    }

    if (signal.order === "sell" && signal.stopLoss <= signal.price) {
        return false;
    }

    return true;
}

// TODO: validate leverage level and isolate/cross mode

/**
 * Validate trading signal before execution
 */
export async function validateSignal(signal: TradingSignal, context?: any): Promise<ValidationResult> {
    try {
        // Check if symbol exists
        const symbolValid = await validateSymbol(signal, context);
        if (!symbolValid) {
            return {
                isValid: false,
                reason: `Invalid symbol: ${signal.symbol} not found on HyperLiquid`
            };
        }

        const stoplossValid = await validateStopLoss(signal, context);
        context.log(`Stop loss validation for ${signal.symbol}: ${stoplossValid}`);
        if (!stoplossValid) {
            return {
                isValid: false,
                reason: `Invalid stop loss for ${signal.symbol}`
            };
        }

        const userAddress = process.env.HYPERLIQUID_USER_ADDRESS;
        if (userAddress) {
            const hasPosition = await checkExistingPosition(signal, userAddress, context);
            
            if (signal.signal === "entry" && hasPosition) {
                return {
                    isValid: false,
                    skipped: true,
                    reason: `Already have open position for ${signal.symbol}`
                };
            }
            
            if (signal.signal === "exit" && !hasPosition) {
                return {
                    isValid: false,
                    skipped: true,
                    reason: `No open position found for ${signal.symbol} to exit`
                };
            }

            else {
                return {
                    isValid: true,
                    skipped: false
                };
            }
        }

        return { isValid: true };

    } catch (error) {
        return {
            isValid: false,
            reason: error instanceof Error ? error.message : "Validation error"
        };
    }
}