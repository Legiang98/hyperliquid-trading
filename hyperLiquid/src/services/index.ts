import { parseWebhook } from './parseWebhook';
import { validateSignal } from './validateSignal';
import { buildOrder } from './buildOrder';
import { executeOrder } from './executeOrder';
import { logTrade } from './logTrade';
import { trailingStoploss } from './trailingStop';

export const services = {
    parseWebhook,
    validateSignal,
    buildOrder,
    executeOrder,
    logTrade,
    trailingStoploss
}

/**
 * Export individual services for direct imports if needed
 */
export { parseWebhook, validateSignal, buildOrder, executeOrder, logTrade, trailingStoploss };

/**
 * Export types
 */
export type { WebhookPayload, TradingSignal, ValidationResult, OrderResult } from '../types';