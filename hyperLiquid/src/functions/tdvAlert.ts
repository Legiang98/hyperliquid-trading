import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Azure Function to receive and display the full TradingView alert message.
 * Logs the entire request body and returns it in the HTTP response.
 */
export async function getTdvMessage(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    context.log?.("Received body:", JSON.stringify(body)); // Log the full body

    return { status: 200, body: JSON.stringify(body) };
  } catch (err) {
    context.error?.("Error in TDV function:", err);
    return { status: 500, body: "Internal server error" };
  }
};

app.http('getTdvAlert', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: getTdvMessage
});