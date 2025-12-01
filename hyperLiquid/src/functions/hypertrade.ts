import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { services } from "../services/index";
import { webhookSchema } from "../validators/webhookSchema";
import { WebhookPayload } from "../types";
import { HTTP } from "../constants/http";
import { httpResponse } from "../helpers/httpResponse";
import { initDatabase } from "../db/initDatabase";
import { AppError, handleError } from "../helpers/errorHandler";
import { sendTelegramMessage } from "../helpers/telegram";

const { 
    parseWebhook,
    validateSignal,
    buildOrder,
    executeOrder,
    closeOrder,
    updateStopLoss,
    logTrade 
} = services;

async function appInit(context: InvocationContext) {
  try {
    await initDatabase(context);
  } catch (error) {

    const chatId = process.env.TELEGRAM_CHAT_ID;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (chatId && token) {
      await sendTelegramMessage(chatId, token, `🔴 Startup Error: ${error.message}`);
    }
    throw new AppError(error.message, 500);
  }
}

const context = {} as InvocationContext;
appInit(context);

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
                const tradeOrder = await buildOrder(payload, context);
                console.log("Built Order Request:", tradeOrder);
                orderResult = await executeOrder(tradeOrder, context);
                break;

            case "EXIT":
                console.log("Closing position for:", payload.symbol);
                orderResult = await closeOrder(payload, context);
                break;

            case "UPDATE_STOP":
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


    } catch (error) {
        return await handleError(error as Error, context);
    }
}

app.http("hyperLiquidWebhook", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: hyperLiquidWebhook
});
