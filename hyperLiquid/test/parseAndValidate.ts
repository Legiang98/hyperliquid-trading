// import { validateSignal } from "../src/services/validateSignal";
// import { webhookSchema } from "../src/validators/webhookSchema";
// import type { WebhookPayload } from "../src/types";

// // Set environment variables for testing
// process.env.HYPERLIQUID_TESTNET = "true";
// process.env.HYPERLIQUID_USER_ADDRESS = "0x9074d59bB220E8d0135e522c03769991698aEF17";

// // Load private key from local.settings.json
// const localSettings = require("./local.settings.json");
// process.env.HYPERLIQUID_PRIVATE_KEY = localSettings.Values.HYPERLIQUID_PRIVATE_KEY;

// // Test BUY order payload
// const buyPayload = {
//     symbol: "BTC",
//     action: "BUY",
//     type: "LONG",
//     price: 95000,
//     stopLoss: 94000
// };

// async function runTest() {
//     console.log("=== Testing BUY Order ===\n");
//     console.log("Payload:", JSON.stringify(buyPayload, null, 2));
    
//     try {
//         // Validate schema
//         const validated = await webhookSchema.validateAsync(buyPayload) as WebhookPayload;
//         console.log("✅ Schema valid");
        
//         // Validate signal
//         const validation = await validateSignal(validated);
//         console.log("Validation:", JSON.stringify(validation, null, 2));
        
//         if (validation.isValid) {
//             console.log("✅ Valid signal");
//         } else {
//             console.log("❌ Invalid:", validation.reason);
//         }
//     } catch (error: any) {
//         if (error.isJoi) {
//             console.log("❌ Schema validation failed:", error.details);
//         } else {
//             console.log("❌ Error:", error.message);
//         }
//     }
// }

// runTest();
