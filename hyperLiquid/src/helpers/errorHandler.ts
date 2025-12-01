import { HttpResponseInit, InvocationContext } from "@azure/functions";
import { httpResponse } from "./httpResponse";
import { HTTP } from "../constants/http";

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = HTTP.INTERNAL_SERVER_ERROR, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle errors in Azure Functions
 */
export function handleError(error: Error | AppError, context: InvocationContext): HttpResponseInit {
    const isDev = process.env.NODE_ENV !== "production";
    
    // Log error details
    context.error("Error occurred:", {
        name: error.name,
        message: error.message,
        stack: isDev ? error.stack : undefined
    });

    // Handle custom application errors
    if (error instanceof AppError) {
        return httpResponse(error.statusCode, error.message, {
            error: error.name,
            timestamp: new Date().toISOString(),
            ...(isDev && { stack: error.stack })
        });
    }

    // Handle unknown errors
    return httpResponse(
        HTTP.INTERNAL_SERVER_ERROR,
        isDev ? error.message : "Internal server error",
        {
            error: "UnhandledError",
            timestamp: new Date().toISOString(),
            ...(isDev && { stack: error.stack })
        }
    );
}