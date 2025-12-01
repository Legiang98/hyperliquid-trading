import { HTTP } from "../constants/http";

export function httpResponse(
    status: HTTP,
    message: string,
    data?: any
) {
    return {
        status,
        jsonBody: {
            success: status < 400,
            message,
            ...(data && { ...data })
        }
    };
}
