import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Simple Azure Function that responds with "Hello, world!" to GET requests.
 */
export async function helloWorld(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: { message: "Hello, world!" }
  };
}

app.http('helloWorld', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: helloWorld
});
