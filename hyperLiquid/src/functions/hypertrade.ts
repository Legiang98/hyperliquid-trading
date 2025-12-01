import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { services } from "../services/index";
import { webhookSchema } from "../validators/webhookSchema";
import { WebhookPayload } from "../types";
import { HTTP } from "../constants/http";
import { httpResponse } from "../helpers/httpResponse";
import { initDatabase } from "../db/initDatabase";
import { AppError, handleError } from "../helpers/errorHandler";

const { 
    parseWebhook,
    validateSignal,
    buildOrder,
    executeOrder,
    closeOrder,
    updateStopLoss,
    logTrade 
} = services;

const dbInitPromise = initDatabase().catch(() => {
    throw new AppError("Failed to initialize database", HTTP.INTERNAL_SERVER_ERROR);
});

async function hyperLiquidWebhook(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {

    try {
        const body = await request.json();
        
        /** 
        * Step 1: Validate webhook schema
        * Example parsed payload:
        * {
        *   symbol: "BTC",
        *   action: "ENTRY",
        *   type: "BUY",
        *   price: 95000,
        *   stopLoss: 94000
        * }
        */
        const rawPayload = await webhookSchema.validateAsync(body, { abortEarly: false }) as WebhookPayload;
        const payload = parseWebhook(rawPayload);
        const validation = await validateSignal(payload, context);
        console.log("Validation Result:", validation);
        
        if (!validation.isValid) {
            return httpResponse(HTTP.BAD_REQUEST, validation.reason!);
        }

        /**
         * Step 2: Route based on action type
         */
        let orderResult: any;

        switch (payload.action.toUpperCase()) {
            case "ENTRY":
                // Build and execute new order
                const tradeOrder = await buildOrder(payload, context);
                console.log("Built Order Request:", tradeOrder);
                orderResult = await executeOrder(tradeOrder, context);
                break;

            case "EXIT":
                // Close existing position
                console.log("Closing position for:", payload.symbol);
                orderResult = await closeOrder(payload, context);
                break;

            case "UPDATE_STOP":
                // Update trailing stop loss
                console.log("Updating stop loss for:", payload.symbol);
                orderResult = await updateStopLoss(payload, context);
                break;

            default:
                return httpResponse(HTTP.BAD_REQUEST, `Unknown action: ${payload.action}`);
        }

        if (!orderResult.success) {
            return httpResponse(HTTP.BAD_REQUEST, orderResult.error || "Operation failed");
        }

        return httpResponse(HTTP.OK, orderResult.message || "Operation successful", { 
            orderId: orderResult.orderId,
            dbOrderId: orderResult.dbOrderId 
        });

        // // // Step 5: Log trade
        // const emoji = orderResult.success ? "✅" : "❌";
        // const action = signal.signal === "entry" ? (signal.order === "buy" ? "🟢 Buy" : "🔴 Sell") : "🔁 Exit";
        // const msg = `
        // ${emoji} *Trade ${orderResult.success ? "Executed" : "Failed"}*
        // *Symbol:* ${signal.symbol}
        // *Action:* ${action}
        // *Price:* ${signal.price}
        // *Stop Loss:* ${signal.stopLoss ?? "-"}
        // *Time:* ${new Date().toLocaleString()}
        // `.trim();

        // const functionAppDomain = process.env.FUNCTION_APP_DOMAIN || "http://localhost:7071"
        // context.log(`Sending Telegram message via ${functionAppDomain}/api/telegrambot`);
        // context.log(msg);
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
        return handleError(error as Error, context);
    }
}

app.http("hyperLiquidWebhook", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: hyperLiquidWebhook
});
