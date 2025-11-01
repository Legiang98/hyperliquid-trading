function checkTradingViewEmails() {
  const threads = GmailApp.search('from:noreply@tradingview.com newer_than:10m');
  console.log(`Found ${threads.length} threads`);

  threads.forEach((thread) => {
    const messages = thread.getMessages();
    messages.forEach((message) => {
      const subject = message.getSubject();
      const body = message.getPlainBody();
      console.log(`Subject: ${subject}`);
      console.log(`Body snippet: ${body.substring(0, 200)}...`);

      // Example: parse or check content
      if (body.includes('order sell') || body.includes('order buy')) {
        console.log('Trading signal detected! Sending webhook...');
        sendToWebhook({ subject, body });
      } else {
        console.log('No trading signal found in this message.');
      }
    });
  });
}

function sendToWebhook(data) {
  const webhookUrl = 'https://your-api-endpoint.com/trading-signal';
  const payload = {
    subject: data.subject,
    body: data.body,
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
