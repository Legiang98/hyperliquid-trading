function checkTradingViewEmails() {
  const labelName = 'Processed-TDV'; // optional label to mark processed
  const label = GmailApp.createLabel(labelName);

  // Search for recent TradingView alerts
  const threads = GmailApp.search('from:noreply@tradingview.com newer_than:10m');
  console.log(`Found ${threads.length} threads`);

  threads.forEach((thread) => {
    const messages = thread.getMessages();
    messages.forEach((message) => {
      const body = message.getPlainBody().trim();
      console.log(`Body snippet: ${body.substring(0, 200)}...`);

      // Extract the JSON part (TradingView often sends text + JSON)
      const jsonMatch = body.match(/{.*}/s); // find first {...} block
      if (!jsonMatch) {
        console.log('No JSON data found in this message.');
        return;
      }

      try {
        const jsonData = JSON.parse(jsonMatch[0]);
        console.log(`Parsed TradingView data: ${JSON.stringify(jsonData)}`);

        // send parsed data to webhook
        sendToWebhook(jsonData);

        // Label the message as processed
        message.addLabel(label);
      } catch (err) {
        console.error(`Failed to parse JSON: ${err}`);
      }
    });
  });
}

function sendToWebhook(jsonData) {
  const webhookUrl = 'https://test-webhook-ceczddgjgtfadxdj.southeastasia-01.azurewebsites.net/api/tradingHook';

  const payload = {
    pair: jsonData.pair,
    action: jsonData.action,
    entry: jsonData.entry,
    stopLoss: jsonData.stopLoss,
    position: jsonData.position,
    receivedAt: new Date().toISOString(),
  };

  console.log(`Sending payload to webhook: ${JSON.stringify(payload)}`);

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
  };

  const response = UrlFetchApp.fetch(webhookUrl, options);
  console.log(`Webhook response: ${response.getResponseCode()}`);
}
