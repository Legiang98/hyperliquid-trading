// import { trailingStoploss } from "../src/services/closeOrder";
// import type { trailingStoplossRequest } from "../src/types";

// // Set environment variables for testing
// process.env.HYPERLIQUID_TESTNET = "true";
// process.env.HYPERLIQUID_USER_ADDRESS = "0x9074d59bB220E8d0135e522c03769991698aEF17";

// // Load private key from local.settings.json
// const localSettings = require("./local.settings.json");
// process.env.HYPERLIQUID_PRIVATE_KEY = localSettings.Values.HYPERLIQUID_PRIVATE_KEY;

// // Test signal for updating trailing stop on a BUY position (LONG)
// const buySignal: trailingStoplossRequest = {
//     symbol: "BTC",
//     action: "EXIT",
//     position: "BUY",
//     stopLoss: 88000.00,
// };

// async function testUpdateTrailingStop() {
//     console.log("=== Testing Update Trailing Stop for BUY Position ===");
//     console.log("Signal:", JSON.stringify(buySignal, null, 2));

//     try {
//         const result = await trailingStoploss(buySignal);
//         console.log("Result:", JSON.stringify(result, null, 2));

//         if (result.success) {
//             console.log("✅ Trailing stop updated successfully!");
//         } else {
//             console.log("❌ Update failed:", result.error);
//         }
//     } catch (error) {
//         console.error("Error:", error);
//     }
// }

// testUpdateTrailingStop();
