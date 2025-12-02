import { Pool } from 'pg';
import { AppError } from '../helpers/errorHandler';
import { HTTP } from '../constants/http';

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  statement_timeout: 5000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

(async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully');
    client.release();
  } catch (err) {
    throw new AppError(`Failed to connect to PostgreSQL: ${err instanceof Error ? err.message : 'Unknown error'}`, HTTP.INTERNAL_SERVER_ERROR);
  }
})();

export default pool;
