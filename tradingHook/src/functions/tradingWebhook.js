const { app } = require('@azure/functions');

const hyperliquidTriggerUrl = process.env.HYPERLIQUID_TRIGGER_URL 

app.http('tradingWebhook', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        if (request.method === 'GET') {
            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                jsonBody: {
                    message: 'Trading Webhook is running',
                    timestamp: new Date().toISOString()
                }
            };
        }

        // Handle POST request
        let payload = {};
        try {
            payload = await request.json();
        } catch (e) {
            context.log('No JSON body found or invalid JSON.');
        }

        const { subject, body, receivedAt, orderId, pair, action, entry, stopLoss } = payload;

        // Simulate trigger to Hyperliquid
        let hyperliquidResponse = null;
        try {
            const res = await fetch(hyperliquidTriggerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pair, action, entry, stopLoss, orderId })
            });
            hyperliquidResponse = await res.json();
            context.log('Hyperliquid simulation response:', hyperliquidResponse);
        } catch (err) {
            context.log('Failed to trigger Hyperliquid simulation:', err);
        }

        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            jsonBody: {
                message: 'Webhook processed successfully',
                subject,
                body,
                receivedAt,
                orderId,
                hyperliquid: hyperliquidResponse
            }
        };
    }
});
