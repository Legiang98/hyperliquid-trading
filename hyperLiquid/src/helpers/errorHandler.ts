import { HttpResponseInit, InvocationContext } from "@azure/functions";
import { httpResponse } from "./httpResponse";
import { HTTP } from "../constants/http";
import { sendTelegramMessage } from "./telegram";

export class AppError extends Error {
    public statusCode: number;
    public message: string;

    constructor(message: string, statusCode: number = HTTP.INTERNAL_SERVER_ERROR) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.message = message;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle errors in Azure Functions
 */
export async function handleError(error: Error, context: InvocationContext): Promise<HttpResponseInit> {
    const isDev = process.env.NODE_ENV !== "production";
    const statusCode = (error instanceof AppError) ? error.statusCode : 500;

    // Log the error
    context.error("Error occurred:", {
        name: error.name,
        message: error.message,
        stack: isDev ? error.stack : undefined
    });

    // Send Telegram alert for all errors
    try {
        const chatId = process.env.TELEGRAM_CHAT_ID;
        const token = process.env.TELEGRAM_BOT_TOKEN;

        if (chatId && token) {
            const emoji = statusCode >= 500 ? "🔴" : "⚠️";
            const message = `${emoji} *${error.name}* (${statusCode})\n${error.message}`;
            await sendTelegramMessage(chatId, token, message);
        }
    } catch (telegramErr) {
        console.error("Failed to send Telegram notification:", telegramErr);
    }

    // Build the HTTP response
    const responseBody = {
        error: error.name,
        message: isDev ? error.message : "Internal server error",
        timestamp: new Date().toISOString(),
        ...(isDev && { stack: error.stack })
    };

    return httpResponse(statusCode, responseBody.message, responseBody);
}
