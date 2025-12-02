import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { services } from "../services/index";
import { webhookSchema } from "../validators/webhookSchema";
import { WebhookPayload } from "../types";
import { HTTP } from "../constants/http";
import { httpResponse } from "../helpers/httpResponse";
import { initDatabase } from "../db/initDatabase";
import { AppError, handleError } from "../helpers/errorHandler";
import { sendTelegramMessage } from "../helpers/telegram";
import { appInit } from "../helpers/appInit";
const { 
    parseWebhook,
    validateSignal,
    buildOrder,
    executeOrder,
    closeOrder,
    updateStopLoss,
    logTrade 
} = services;

appInit();

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
        context.log("Parsed Payload:", payload);
        const validation = await validateSignal(payload, context);
        context.log("Validation Result:", validation);
        
        if (!validation.isValid) {
            return httpResponse(HTTP.BAD_REQUEST, validation.reason!);
        }

        /**
         * Step 2: Route based on action type
         */
        let orderResult: any;

        switch (payload.action.toUpperCase()) {
            case "ENTRY":
                const tradeOrder = await buildOrder(payload, context);
                context.log("Built Order Request:", tradeOrder);
                orderResult = await executeOrder(tradeOrder, context);
                break;

            case "EXIT":
                orderResult = await closeOrder(payload, context);
                context.log("Close Order Result:", orderResult);
                break;

            case "UPDATE_STOP":
                orderResult = await updateStopLoss(payload, context);
                context.log("Update Stop Loss Result:", orderResult);
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


    } catch (error) {
        return await handleError(error as Error, context);
    }
}

app.http("hyperLiquidWebhook", {
    methods: ["POST"],
    authLevel: "function",
    handler: hyperLiquidWebhook
});
