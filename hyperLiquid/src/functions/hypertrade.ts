import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { services } from "../services/index";

const { 
    parseWebhook,
    validateSignal,
    buildOrder,
    executeOrder,
    logTrade 
} = services;

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
        const payload = await request.json();
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

        // else {
        //     return {
        //         status: 200,
        //         jsonBody: {
        //             success: true,
        //             message: "Signal is valid and ready for processing"
        //         }
        //     }
        // }

        context.log("Signal validated successfully");

        // Step 3 & 4: Build and Execute Order based on signal type
        let orderResult;

        if (signal.signal === "entry") {
            context.log("Building order for entry signal");
            const orderRequest = await buildOrder(signal, context);
            context.log("Executing order request:", JSON.stringify(orderRequest));
            orderResult = await executeOrder(orderRequest, signal, context);
        } else if (signal.signal === "exit") {
            context.log("Executing exit order");
            orderResult = await executeOrder(null, signal, context);
        } else if (signal.signal === "update_stop") {
            // TODO: Implement stop loss update
            context.log("Stop loss update not yet implemented");
            return {
                status: 200,
                jsonBody: {
                    success: false,
                    skipped: true,
                    reason: "Stop loss update not yet implemented"
                }
            };
        } else {
            context.log("Unknown signal type:", signal.signal);
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: `Unknown signal type: ${signal.signal}`
                }
            };
        }

        // // Step 5: Log trad
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
        //     context.log.error("Failed to send Telegram message:", err);
        // }


        // // Step 6: Return response
        // return {
        //     status: 200,
        //     jsonBody: {
        //         success: orderResult.success,
        //         message: orderResult.message || orderResult.error,
        //         signal: {
        //             symbol: signal.symbol,
        //             side: signal.side,
        //             type: signal.signal
        //         },
        //         orderId: orderResult.orderId,
        //         timestamp: new Date().toISOString()
        //     }
        // };

    } catch (error) {
        context.error("Error processing webhook:", error);
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
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
