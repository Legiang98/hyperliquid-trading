/**
 * Configuration
 */
const CONFIG = {
  labelName: 'Processed-TDV',
  scanDaysBack: 1, // Only scan emails from last 1 day
  webhookUrl: 'YOUR_AZURE_FUNCTION_URL/api/hyperLiquidWebhook',
  searchQuery: 'subject:"TradingView Alert" is:unread' // Adjust as needed
};

/**
 * Get the date for filtering emails (1 day ago)
 */
function getDateFilter() {
  const date = new Date();
  date.setDate(date.getDate() - CONFIG.scanDaysBack);
  return Math.floor(date.getTime() / 1000); // Unix timestamp
}

/**
 * Main function to process TradingView alerts from Gmail
 */
function processTradingViewAlerts() {
  try {
    // Get or create label
    const label = getOrCreateLabel(CONFIG.labelName);
    
    // Build search query with date filter
    const dateFilter = getDateFilter();
    const searchQuery = `${CONFIG.searchQuery} after:${dateFilter}`;
    
    Logger.log(`Searching emails with query: ${searchQuery}`);
    
    // Search for unprocessed emails from the last day
    const threads = GmailApp.search(searchQuery, 0, 50); // Max 50 emails
    
    if (threads.length === 0) {
      Logger.log('No new emails to process');
      return;
    }
    
    Logger.log(`Found ${threads.length} email(s) to process`);
    
    // Process each thread
    threads.forEach((thread, index) => {
      try {
        processThread(thread, label);
      } catch (error) {
        Logger.log(`Error processing thread ${index + 1}: ${error}`);
      }
    });
    
    Logger.log('Processing complete');
    
  } catch (error) {
    Logger.log(`Error in main function: ${error}`);
  }
}

/**
 * Get or create Gmail label
 */
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log(`Created new label: ${labelName}`);
  }
  return label;
}

/**
 * Process a single email thread
 */
function processThread(thread, label) {
  const messages = thread.getMessages();
  
  messages.forEach((message, msgIndex) => {
    try {
      const body = message.getPlainBody();
      const subject = message.getSubject();
      const date = message.getDate();
      
      Logger.log(`Processing message ${msgIndex + 1}: ${subject} (${date})`);
      
      // Extract and parse JSON from email body
      const payload = extractJsonFromBody(body);
      
      if (!payload) {
        Logger.log(`No valid JSON found in message ${msgIndex + 1}`);
        return;
      }
      
      // Send to webhook
      const success = sendToWebhook(payload);
      
      if (success) {
        Logger.log(`Successfully sent alert: ${JSON.stringify(payload)}`);
      } else {
        Logger.log(`Failed to send alert: ${JSON.stringify(payload)}`);
      }
      
    } catch (error) {
      Logger.log(`Error processing message ${msgIndex + 1}: ${error}`);
    }
  });
  
  // Mark thread as processed
  thread.addLabel(label);
  thread.markRead();
  Logger.log(`Marked thread as processed: ${thread.getFirstMessageSubject()}`);
}

/**
 * Extract JSON payload from email body
 */
function extractJsonFromBody(body) {
  try {
    // Try to find JSON in the body
    const jsonMatch = body.match(/\{[^}]+\}/);
    
    if (!jsonMatch) {
      return null;
    }
    
    const jsonString = jsonMatch[0];
    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    if (!parsed.pair || !parsed.action || !parsed.entry) {
      Logger.log('Invalid payload: missing required fields');
      return null;
    }
    
    return parsed;
    
  } catch (error) {
    Logger.log(`Error extracting JSON: ${error}`);
    return null;
  }
}

/**
 * Send payload to Azure Function webhook
 */
function sendToWebhook(payload) {
  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(CONFIG.webhookUrl, options);
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      Logger.log(`Webhook response: ${response.getContentText()}`);
      return true;
    } else {
      Logger.log(`Webhook error (${statusCode}): ${response.getContentText()}`);
      return false;
    }
    
  } catch (error) {
    Logger.log(`Error sending to webhook: ${error}`);
    return false;
  }
}

/**
 * Test function - processes only one email
 */
function testProcessOneEmail() {
  const label = getOrCreateLabel(CONFIG.labelName);
  const threads = GmailApp.search('subject:"TradingView Alert" is:unread', 0, 1);
  
  if (threads.length > 0) {
    processThread(threads[0], label);
  } else {
    Logger.log('No emails found for testing');
  }
}