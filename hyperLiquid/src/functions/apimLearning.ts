import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Simple Azure Function that handles GET, POST, and PUT requests.
 */
export async function apimLearning(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const method = request.method;
  
  try {
    switch (method) {
      case 'GET':
        // Handle GET request - return a simple message
        const name = request.query.get('name') || 'Guest';
        return {
          status: 200,
          jsonBody: {
            message: `Hello, ${name}!`,
            method: 'GET',
            timestamp: new Date().toISOString()
          }
        };

      case 'POST':
        // Handle POST request - echo back the received data
        const postBody = await request.json() as any;
        return {
          status: 201,
          jsonBody: {
            message: 'Resource created successfully',
            method: 'POST',
            receivedData: postBody,
            timestamp: new Date().toISOString()
          }
        };

      case 'PUT':
        // Handle PUT request - simulate updating a resource
        const putBody = await request.json() as any;
        const id = request.query.get('id') || 'unknown';
        return {
          status: 200,
          jsonBody: {
            message: `Resource ${id} updated successfully`,
            method: 'PUT',
            updatedData: putBody,
            timestamp: new Date().toISOString()
          }
        };

      default:
        return {
          status: 405,
          jsonBody: {
            error: 'Method not allowed',
            allowedMethods: ['GET', 'POST', 'PUT']
          }
        };
    }
  } catch (error) {
    context.error('Error processing request:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('apimLearning', {
  methods: ['GET', 'POST', 'PUT'],
  authLevel: 'anonymous',
  handler: apimLearning
});
