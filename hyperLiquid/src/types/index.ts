/**
 * Type definitions for HyperLiquid trading webhook
 */

export interface WebhookPayload {
    subject?: string;
    body?: string;
    receivedAt?: string;
    pair: string;
    action: string;
    entry?: number;
    stopLoss?: number;
    orderId?: string;
    position?: string;
    reason?: string;
}


export interface TradingSignal {
    symbol: string;
    order: "buy" | "sell";
    price: number;
    signal: "entry" | "exit" | "update_stop";
    stopLoss?: number;
    orderId?: string;
    reason?: string;
}


export interface OrderRequest {
    symbol: string;
    order: "buy" | "sell";
    quantity: number;
    price: number | "MARKET";
    stopLoss?: number;
}

export interface trailingStoplossRequest {
    symbol: string;
    action: "EXIT";
    position: "BUY" | "SELL";
    stopLoss?: number;
}

export interface OrderResult {
    success: boolean;
    orderId?: string;
    message?: string;
    error?: string;
}

export interface ValidationResult {
    isValid: boolean;
    reason?: string;
    skipped?: boolean;
}

export interface AssetMeta {
    [symbol: string]: {
        szDecimals: number;
    };
}