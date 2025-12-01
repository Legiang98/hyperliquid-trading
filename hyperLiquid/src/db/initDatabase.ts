import pool from './index';
import { readFileSync } from 'fs';
import { join } from 'path';

let isInitialized = false;

export async function initDatabase(): Promise<void> {
  if (isInitialized) return;

  try {
    // Check if orders table exists
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
      
      // Read and execute init.sql
      const initSql = readFileSync(
        join(__dirname, 'migrations', '001_create_orders_table.sql'),
        'utf-8'
      );
      
      await pool.query(initSql);
      console.log('Database initialized successfully');
    }

    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
