import { services } from "../src/services";
import type { TradingSignal } from "../src/types";

process.env.HYPERLIQUID_TESTNET = "true";
process.env.HYPERLIQUID_USER_ADDRESS = "0x9074d59bB220E8d0135e522c03769991698aEF17";
process.env.FIX_STOPLOSS = "5";

const buildOrder = services.buildOrder;

const testSignal: TradingSignal = {
    symbol: "BTC",
    signal: "entry",
    order: "buy",
    price: 101813.333,
    stopLoss: 101600.01001,
};

async function testBuildOrder() {
    try {
        const order = await buildOrder(testSignal);
        console.log("buildOrder result:", order);
    } catch (error) {
        console.error("Error testing buildOrder:", error);
    }
}

testBuildOrder();