import { initDatabase } from '../db/initDatabase';
import { AppError } from '../helpers/errorHandler';
import { sendTelegramMessage } from '../helpers/telegram';

export async function appInit() {
  try {
    await initDatabase();
  } catch (error) {

    const chatId = process.env.TELEGRAM_CHAT_ID;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (chatId && token) {
      await sendTelegramMessage(chatId, token, `🔴 Startup Error: ${error.message}`);
    }
    throw new AppError(error.message, 500);
  }
}