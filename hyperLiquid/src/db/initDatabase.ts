import pool from './index';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppError } from '../helpers/errorHandler';
import { sendTelegramMessage } from '../helpers/telegram';
import { InvocationContext } from '@azure/functions';

let isInitialized = false;

export async function initDatabase(context: InvocationContext): Promise<void> {
  if (isInitialized) return;

  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `);

    const tableExists = result.rows[0].exists;

    if (!tableExists) {
      context.log('Orders table not found. Initializing database...');
      
      const initSql = readFileSync(
        join(__dirname, 'migrations', '001_create_orders_table.sql'),
        'utf-8'
      );
      
      await pool.query(initSql);
      context.log('Database initialized successfully.');
    }

    isInitialized = true;
  } catch (error) {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (chatId && token) {
      await sendTelegramMessage(chatId, token, `🔴 Startup Error: ${error.message}`);
    }
    throw new AppError(error.message, 500);
  }
}
