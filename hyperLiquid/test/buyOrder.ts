import { services } from "../src/services";
import type { TradingSignal, OrderRequest } from "../src/types";

// Set environment variables for testing
process.env.HYPERLIQUID_TESTNET = "true";
process.env.HYPERLIQUID_USER_ADDRESS = "0x9074d59bB220E8d0135e522c03769991698aEF17";
// TODO: Set your testnet private key here (64-character hex string)
// Example: process.env.HYPERLIQUID_PRIVATE_KEY = "0xabcd1234...";
// Or load from local.settings.json:
const localSettings = require("../test/local.settings.json");
process.env.HYPERLIQUID_PRIVATE_KEY = localSettings.Values.HYPERLIQUID_PRIVATE_KEY;
process.env.FIX_STOPLOSS = "5";

const { buildOrder, executeOrder } = services;

// Test signal for BUY order
const buySignal: TradingSignal = {
    symbol: "BTC",
    signal: "entry",
    order: "buy",
    price: 101813.333,
    stopLoss: 101600.01001,
};

const sellSignal: TradingSignal = {
    symbol: "ETH",
    signal: "entry",
    order: "sell",
    price: 3500.50,
    stopLoss: 3550.75,
};

async function testBuyOrder() {
    console.log("\n=== Testing BUY Order ===");
    try {
        // Build the order request
        const orderRequest = await buildOrder(buySignal);
        console.log("Order Request:", JSON.stringify(orderRequest, null, 2));

        // Execute the order
        const result = await executeOrder(orderRequest, buySignal);
        console.log("Execution Result:", JSON.stringify(result, null, 2));

        if (result.success) {
            console.log("✅ BUY order executed successfully!");
        } else {
            console.log("❌ BUY order failed:", result.error);
        }
    } catch (error) {
        console.error("Error testing BUY order:", error);
    }
}

// Test SELL order execution
async function testSellOrder() {
    console.log("\n=== Testing SELL Order ===");
    try {
        // Build the order request
        const orderRequest = await buildOrder(sellSignal);
        console.log("Order Request:", JSON.stringify(orderRequest, null, 2));

        // Execute the order
        const result = await executeOrder(orderRequest, sellSignal);
        console.log("Execution Result:", JSON.stringify(result, null, 2));

        if (result.success) {
            console.log("✅ SELL order executed successfully!");
        } else {
            console.log("❌ SELL order failed:", result.error);
        }
    } catch (error) {
        console.error("Error testing SELL order:", error);
    }
}

// Run both tests
async function runTests() {
    console.log("Starting Order Execution Tests...");
    console.log("=====================================");
    
    await testBuyOrder();
    
    // Wait a bit between orders
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    // await testSellOrder();
    
    // console.log("\n=====================================");
    // console.log("Tests completed!");
}

runTests();
