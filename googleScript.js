/**
 * Main entry point — checks Gmail for TradingView alerts
 * and sends them to your webhook.
 */

// function getLabelNames(thread) {
//   return thread.getLabels().map(label => label.getName());
// }

function checkTradingViewEmails() {
  const PROCESSED_LABEL = 'Processed-TDV';
  const label = GmailApp.createLabel(PROCESSED_LABEL);
  const query = 'from:noreply@tradingview.com newer_than:7d';
  const threads = GmailApp.search(query, 0, 1); // limit to 15 threads to avoid timeouts
  console.log(`Found ${threads.length} threads matching search criteria.`);

  threads.forEach((thread) => {
    const labels = thread.getLabels();
    const labelNames = labels.map(label => label.getName());
    if (labelNames.includes(PROCESSED_LABEL)) {
      console.log("Skipping (already processed).");
      return;
    }

    const messages = thread.getMessages();
    messages.forEach((message) => {
      // Extract JSON object
      const body = message.getPlainBody().trim();
      const jsonData = extractJsonFromEmail(body);
      if (!jsonData) {
        console.log("No valid JSON found — skipping.");
        return;
      }

      const success = sendToWebhook(jsonData);
      if (success) {
        thread.addLabel(label);
        console.log("Message labeled as processed.");
      }
    });
  });
}

/**
 * Extract the JSON `{ ... }` block from the email body.
 * TradingView often includes plain text + JSON, so we pick the first match.
 */
function extractJsonFromEmail(body) {
  const jsonMatch = body.match(/{.*}/s); // matches first {...} block

  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`Failed to parse JSON: ${err}`);
    return null;
  }
}

/**
 * Send parsed TradingView alert to your webhook endpoint.
 * Handles errors and returns a boolean representing success/failure.
 */
function sendToWebhook(jsonData) {
  const webhookUrl = 'https://hyperliquid-dev-func.azurewebsites.net/api/hyperLiquidWebhook';

  const payload = {
    pair: jsonData.pair,
    action: jsonData.action,
    entry: jsonData.entry,
    stopLoss: jsonData.stopLoss,
    receivedAt: new Date().toISOString()
  };

  console.log(`Sending payload: ${JSON.stringify(payload)}`);

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // allows capturing error responses
  };

  try {
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const status = response.getResponseCode();

    console.log(`Webhook responded with status ${status}`);

    if (status >= 200 && status < 300) {
      return true; // success
    }

    console.error(`Webhook failed: ${response.getContentText()}`);
    return false;

  } catch (error) {
    console.error(`Webhook request error: ${error}`);
    return false;
  }
}
