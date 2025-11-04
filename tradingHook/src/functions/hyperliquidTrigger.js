const { app } = require('@azure/functions');

app.http('hyperliquidTrigger', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Simulating Hyperliquid trade trigger...`);
        let tradeDetails = {};
        try {
            tradeDetails = await request.json();
        } catch (e) {
            context.log('No JSON body found or invalid JSON.');
        }

        context.log('Trade Details:', tradeDetails);

        // Simulate trade execution
        const { pair, action, entry, stopLoss, orderId } = tradeDetails;
        context.log(`Simulated trade: ${action} ${pair} at ${entry} with stop loss ${stopLoss} (Order ID: ${orderId})`);

        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            jsonBody: {
                message: 'Hyperliquid trade simulated',
                trade: tradeDetails,
                simulated: true
            }
        };
    }
});