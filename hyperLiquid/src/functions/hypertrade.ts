import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { services } from "../services/index";

const { 
    parseWebhook,
    validateSignal,
    buildOrder,
    executeOrder,
    logTrade 
} = services;

import { WebhookPayload } from "../services";
/**
 * Main Azure Function for HyperLiquid trading webhook
 * Orchestrates: parse -> validate -> build -> execute -> log
 */
async function hyperLiquidWebhook(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {

    try {
        // Step 1: Parse incoming webhook
        const payload = await request.json() as WebhookPayload;
        // context.log("Received payload:", JSON.stringify(payload));

        const signal = await parseWebhook(payload);
        if (!signal) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: "Invalid webhook payload format"
                }
            };
        }

        context.log("Parsed signal:", JSON.stringify(signal));

        // Step 2: Validate signal
        const validation = await validateSignal(signal, context);
        context.log("Validation result:", JSON.stringify(validation));
        if (!validation.isValid) {
            // context.log("Signal validation failed:", validation.reason);
            return {
                status: 200,
                jsonBody: {
                    success: false,
                    skipped: true,
                    reason: validation.reason
                }
            };
        }

        if (validation.skipped) {
            // context.log("Signal skipped:", validation.reason);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    skipped: true,
                    reason: validation.reason
                }
            };
        }


        context.log("Signal validated successfully");

        // Step 3 & 4: Build and Execute Order based on signal type
        let orderResult;

        if (signal.signal === "entry") {
            const orderRequest = await buildOrder(signal, context);
            orderResult = await executeOrder(orderRequest, signal, context);
        } else if (signal.signal === "exit") {
            orderResult = await executeOrder(null, signal, context);
        } else if (signal.signal === "update_stop") {
            // TODO: Implement stop loss update
            return {
                status: 200,
                jsonBody: {
                    success: false,
                    skipped: true,
                    reason: "Stop loss update not yet implemented"
                }
            };
        } else {
            throw new Error("Unknown signal type");
        }

        // // Step 5: Log trade
        const emoji = orderResult.success ? "✅" : "❌";
        const action = signal.signal === "entry" ? (signal.order === "buy" ? "🟢 Buy" : "🔴 Sell") : "🔁 Exit";
        const msg = `
        ${emoji} *Trade ${orderResult.success ? "Executed" : "Failed"}*
        *Symbol:* ${signal.symbol}
        *Action:* ${action}
        *Price:* ${signal.price}
        *Stop Loss:* ${signal.stopLoss ?? "-"}
        *Time:* ${new Date().toLocaleString()}
        `.trim();

        const functionAppDomain = process.env.FUNCTION_APP_DOMAIN || "http://localhost:7071"
        context.log(`Sending Telegram message via ${functionAppDomain}/api/telegrambot`);
        context.log(msg);
        // try {
        //     await fetch(`${functionAppDomain}/api/telegrambot`, {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({ message: msg, parse_mode: "Markdown" })
        //     });
        // } catch (err) {
        //     context.error("Failed to send Telegram message:", err);
        // } 

    } catch (error) {
        context.error("Error processing webhook:", error);
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: "Internal server error",
                timestamp: new Date().toISOString()
            }
        };
    }
}

app.http("hyperLiquidWebhook", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: hyperLiquidWebhook
});
