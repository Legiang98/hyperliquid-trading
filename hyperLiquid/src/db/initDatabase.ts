import pool from './index';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppError } from '../helpers/errorHandler';
import { HTTP } from '../constants/http';
import { InvocationContext } from '@azure/functions';

let isInitialized = false;

export async function initDatabase(): Promise<void> {
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
      console.log('Orders table not found. Initializing database...');
      
      const initSql = readFileSync(
        join(__dirname, 'migrations', '001_create_orders_table.sql'),
        'utf-8'
      );
      
      await pool.query(initSql);
      console.log('Database initialized successfully.');
    }

    console.log('Database is ready.');

    isInitialized = true;
  } catch (error) {
    throw new AppError(
      `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HTTP.INTERNAL_SERVER_ERROR
    );
  }
}
