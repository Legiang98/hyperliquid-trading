import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { sendTelegramMessage } from "../helpers/telegram";

/** Telegram Bot Azure Function
 * Receives messages via HTTP request and forwards them to a Telegram chat
 */
export async function telegrambot(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { message } = await request.json() as { message?: string };
    if (!message) {
      return { status: 400, body: "Missing 'message' in request body" };
    }

    const chatId = process.env.TELEGRAM_CHAT_ID;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    await sendTelegramMessage(chatId!, token!, message);

    return { status: 200, body: "Message sent to Telegram!" };

  } catch (err) {
    context.error?.("Error in Telegram function:", err);
    return { status: 500, body: "Internal server error" };
  }
};

app.http('telegrambot', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: telegrambot
});