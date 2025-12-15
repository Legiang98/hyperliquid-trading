import { AppError } from '../helpers/errorHandler';
import { sendTelegramMessage } from '../helpers/telegram';

export async function appInit() {
  // Table Storage doesn't require initialization
  // Connection is established on-demand via connection string
  console.log('App initialized - using Azure Table Storage');
}