// server/init-db.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Function to read wrangler's .env file
function getDatabaseUrl() {
  try {
    const varsPath = path.resolve(__dirname, '.env');
    const varsFile = fs.readFileSync(varsPath, 'utf8');
    const match = varsFile.match(/^DATABASE_URL\s*=\s*"(.*)"/m);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error('DATABASE_URL not found in .env');
  } catch (err) {
    console.error('Error reading .env:', err.message);
    console.log('Falling back to process.env.DATABASE_URL');
    return process.env.DATABASE_URL;
  }
}

const DATABASE_URL = getDatabaseUrl();

if (!DATABASE_URL) {
  console.error("Database URL is not configured. Please check your .env or environment variables.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// PostgreSQL-compatible schema
const schema = `
  CREATE TABLE IF NOT EXISTS books_v2 (
    uuid UUID PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS book_files (
    id SERIAL PRIMARY KEY,
    book_uuid UUID NOT NULL,
    format TEXT NOT NULL,
    r2_path TEXT NOT NULL,
    original_filename TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_uuid) REFERENCES books_v2 (uuid) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reading_progress (
    username TEXT NOT NULL,
    book_uuid UUID NOT NULL,
    current_cfi TEXT,
    progress_percentage REAL DEFAULT 0,
    last_read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (username, book_uuid)
  );

  CREATE TABLE IF NOT EXISTS highlights (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    book_uuid UUID NOT NULL,
    cfi_range TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username, book_uuid, cfi_range)
  );
`;

async function initializeDatabase() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to the database.');
    
    await client.query(schema);
    console.log('Schema applied successfully. Tables are ready.');
    
  } catch (err) {
    console.error('Error during database initialization:', err);
  } finally {
    if (client) {
      await client.release();
      console.log('Database connection closed.');
    }
    await pool.end();
  }
}

initializeDatabase();
