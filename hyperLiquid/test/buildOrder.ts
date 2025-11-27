import { services } from "../src/services";
import type { TradingSignal } from "../src/types"; // Adjust path if needed
const buildOrder = services.buildOrder;

// Example signal input for testing
const testSignal: TradingSignal = {
    symbol: "BTC",
    signal: "entry",
    order: "buy", // Now TypeScript knows this is the literal "buy"
    price: 101813.333,
    stopLoss: 101600.01001,
    // Add other properties as needed for your buildOrder function
};

// Run the buildOrder function and print the result
async function testBuildOrder() {
    try {
        const order = await buildOrder(testSignal);
        console.log("buildOrder result:", order);
    } catch (error) {
        console.error("Error testing buildOrder:", error);
    }
}

testBuildOrder();