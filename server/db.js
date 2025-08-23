// server/db.js
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("FATAL: DATABASE_URL environment variable is not configured. Please create a .env file.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};

export default db;