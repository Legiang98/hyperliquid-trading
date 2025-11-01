const { app } = require('@azure/functions');

app.http('webhookReceiver', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            context.log('📩 Trading Webhook triggered!');
            context.log(`Method: ${request.method}`);
            context.log(`URL: ${request.url}`);
            
            // Handle both GET and POST requests
            if (request.method === 'GET') {
                context.log('GET request received - webhook endpoint is alive');
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    jsonBody: { 
                        message: 'Trading Webhook is running',
                        timestamp: new Date().toISOString(),
                        endpoint: '/api/webhookReceiver'
                    }
                };
            }

            // Handle POST requests with trading signals
            const body = await request.json().catch(() => ({}));
            const query = request.query || {};
            
            context.log('Headers:', Object.fromEntries(request.headers.entries()));
            context.log('Query params:', Object.fromEntries(query.entries()));
            context.log('Payload received:', JSON.stringify(body, null, 2));

            // Process trading signal
            if (body.subject && body.body) {
                context.log(`📧 Email Subject: ${body.subject}`);
                context.log(`📝 Email Body: ${body.body.substring(0, 200)}...`);
                
                // Check for trading keywords
                const tradingKeywords = ['BUY', 'SELL', 'LONG', 'SHORT', 'SIGNAL'];
                const hasTradeSignal = tradingKeywords.some(keyword => 
                    body.subject.toUpperCase().includes(keyword) || 
                    body.body.toUpperCase().includes(keyword)
                );
                
                if (hasTradeSignal) {
                    context.log('🚨 Trading signal detected!');
                }
            }

            // Future: Forward to trading system
            if (process.env.TRADER_URL) {
                context.log('🔄 Forwarding to trading system...');
                // await fetch(process.env.TRADER_URL, { 
                //   method: 'POST', 
                //   body: JSON.stringify(body), 
                //   headers: { 'Content-Type': 'application/json' } 
                // });
            }

            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                jsonBody: { 
                    message: 'Trading signal received successfully', 
                    receivedAt: new Date().toISOString(),
                    processed: true
                }
            };

        } catch (error) {
            context.log.error('❌ Error processing webhook:', error);
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                jsonBody: { 
                    error: 'Internal server error', 
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
});