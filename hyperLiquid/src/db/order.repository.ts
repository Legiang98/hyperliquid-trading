import pool from './index';
import { OrderRecord, NewOrder } from '../types/order';

export async function findOpenOrder(
  symbol: string,
  strategy: string
): Promise<OrderRecord | null> {
  const result = await pool.query<OrderRecord>(
    `SELECT * FROM orders 
     WHERE symbol = $1 AND strategy = $2 AND status = 'open' 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [symbol, strategy]
  );
  return result.rows[0] || null;
}

export async function insertOrder(order: NewOrder): Promise<OrderRecord> {
  const result = await pool.query<OrderRecord>(
    `INSERT INTO orders (user_address, symbol, strategy, quantity, order_type, action, price, oid, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      order.user_address,
      order.symbol,
      order.strategy,
      order.quantity,
      order.order_type,
      order.action,
      order.price,
      order.oid || null,
      order.status,
    ]
  );
  return result.rows[0];
}

export async function updateOrderOid(
  orderId: string,
  oid: string
): Promise<void> {
  await pool.query(
    `UPDATE orders 
     SET oid = $1, updated_at = now() 
     WHERE id = $2`,
    [oid, orderId]
  );
}

export async function closeOrder(
  orderId: string,
  pnl: number
): Promise<void> {
  await pool.query(
    `UPDATE orders 
     SET status = 'closed', pnl = $1, updated_at = now() 
     WHERE id = $2`,
    [pnl, orderId]
  );
}

export async function closeAllOrders(
  symbol: string,
  strategy: string,
  pnl: number
): Promise<void> {
  await pool.query(
    `UPDATE orders 
     SET status = 'closed', pnl = $1, updated_at = now() 
     WHERE symbol = $2 AND strategy = $3 AND status = 'open'`,
    [pnl, symbol, strategy]
  );
}
