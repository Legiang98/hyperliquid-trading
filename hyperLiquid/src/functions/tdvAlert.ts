import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Azure Function to receive and display the full TradingView alert message.
 * Logs the entire HTTP request including headers, method, URL, and body.
 */
export async function getTdvMessage(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Get the request body
    let body;
    try {
      body = await request.json();
    } catch {
      // If JSON parsing fails, get raw text
      body = await request.text();
    }

    // Collect all request information
    const fullRequest = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      query: Object.fromEntries(request.query.entries()),
      params: request.params,
      body: body,
      timestamp: new Date().toISOString()
    };

    // Log everything
    context.log("=== FULL REQUEST DETAILS ===");
    context.log("Method:", fullRequest.method);
    context.log("URL:", fullRequest.url);
    context.log("Headers:", JSON.stringify(fullRequest.headers, null, 2));
    context.log("Query Parameters:", JSON.stringify(fullRequest.query, null, 2));
    context.log("Route Parameters:", JSON.stringify(fullRequest.params, null, 2));
    context.log("Body:", JSON.stringify(fullRequest.body, null, 2));
    context.log("Timestamp:", fullRequest.timestamp);
    context.log("=============================");

    return { 
      status: 200, 
      jsonBody: {
        message: "Request received successfully",
        requestDetails: fullRequest
      }
    };
  } catch (err) {
    context.error("Error in TDV function:", err);
    return { 
      status: 500, 
      jsonBody: { 
        error: "Internal server error",
        message: err instanceof Error ? err.message : "Unknown error"
      }
    };
  }
}

app.http('getTdvAlert', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: getTdvMessage
});