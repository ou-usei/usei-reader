// server/app.js
import 'dotenv/config'; // Load .env file
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

import db from './db.js';
import { getS3Client } from './r2-client.js';
import usersData from './users.json' with { type: 'json' };

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // for parsing application/json

// Custom middleware to set cache-control headers for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// Multer setup for file uploads (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- API Routes ---

// GET all books
app.get('/api/books', async (req, res) => {
  try {
    const { rows: books } = await db.query(`
      SELECT
        b.uuid,
        b.title,
        b.author,
        b.created_at,
        f.original_filename
      FROM books_v2 b
      JOIN book_files f ON b.uuid = f.book_uuid
      WHERE f.format = 'epub'
      ORDER BY b.created_at DESC
    `);
    res.json({ success: true, books });
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET all users (from JSON)
app.get('/api/users', (req, res) => {
  res.json({ success: true, users: usersData });
});

// GET a secure, temporary URL to view a book
app.get('/api/books/:uuid/view', async (req, res) => {
  const { uuid } = req.params;
  try {
    const { rows } = await db.query(
      "SELECT * FROM book_files WHERE book_uuid = $1 AND format = 'epub'",
      [uuid]
    );
    const bookFile = rows[0];

    if (!bookFile) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }

    const s3Client = getS3Client(); // Get S3 client
    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: bookFile.r2_path });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({ success: true, url });
  } catch (err) {
    console.error(`Error getting view URL for book ${uuid}:`, err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST to upload a new book
app.post('/api/upload', upload.single('epub'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'EPUB file not provided.' });
  }

  const { originalname, buffer, mimetype } = req.file;
  const bookUUID = uuidv4();
  const r2Key = `epub/${bookUUID}/${originalname}`;

  try {
    const s3Client = getS3Client();
    const uploadToR2 = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: r2Key,
        Body: buffer,
        ContentType: mimetype,
      },
    });
    await uploadToR2.done();

    const title = req.body.title || originalname.substring(0, originalname.lastIndexOf('.')) || originalname;
    const author = req.body.author || '未知作者';

    await db.query(
      'INSERT INTO books_v2 (uuid, title, author) VALUES ($1, $2, $3)',
      [bookUUID, title, author]
    );
    await db.query(
      'INSERT INTO book_files (book_uuid, format, r2_path, original_filename) VALUES ($1, $2, $3, $4)',
      [bookUUID, 'epub', r2Key, originalname]
    );

    res.status(201).json({ success: true, book: { uuid: bookUUID, title, author, filename: originalname } });
  } catch (err) {
    console.error('Error during upload:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET all reading progress for a user
app.get('/api/progress/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const { rows: progress } = await db.query(
      'SELECT * FROM reading_progress WHERE username = $1',
      [username]
    );
    res.json({ success: true, progress });
  } catch (err) {
    console.error(`Error fetching progress for user ${username}:`, err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET specific reading progress for a user and book
app.get('/api/progress/:username/:bookUuid', async (req, res) => {
  const { username, bookUuid } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT * FROM reading_progress WHERE username = $1 AND book_uuid = $2',
      [username, bookUuid]
    );
    const progress = rows[0];
    if (progress) {
      res.json({ success: true, progress });
    } else {
      // If no progress is found, it's not a server error.
      // Return 404 so the frontend knows to start from the beginning.
      res.status(404).json({ success: false, error: 'No progress found for this book.' });
    }
  } catch (err) {
    console.error(`Error fetching specific progress for user ${username}:`, err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST to save reading progress
app.post('/api/progress/:username/:bookUuid', async (req, res) => {
  const { username, bookUuid } = req.params;
  const { currentCfi, progressPercentage } = req.body; // progressPercentage might be added later

  if (!currentCfi) {
    return res.status(400).json({ success: false, error: 'currentCfi is required.' });
  }

  try {
    console.log(`💾 保存用户 ${username} 的阅读进度: ${currentCfi}`);
    const query = `
      INSERT INTO reading_progress (username, book_uuid, current_cfi, progress_percentage)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username, book_uuid) DO UPDATE SET
        current_cfi = EXCLUDED.current_cfi,
        progress_percentage = EXCLUDED.progress_percentage,
        last_read_at = CURRENT_TIMESTAMP
    `;
    await db.query(query, [username, bookUuid, currentCfi, progressPercentage || 0]);
    console.log(`✅ 进度保存成功`);
    res.status(200).json({ success: true, message: 'Progress saved.' });
  } catch (err) {
    console.error(`❌ 保存用户 ${username} 的进度时出错:`, err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// --- Highlights API ---

// POST to add a new highlight
app.post('/api/highlights', async (req, res) => {
  const { username, bookUuid, cfiRange } = req.body;
  if (!username || !bookUuid || !cfiRange) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }
  try {
    const query = `
      INSERT INTO highlights (username, book_uuid, cfi_range)
      VALUES ($1, $2, $3)
      ON CONFLICT (username, book_uuid, cfi_range) DO NOTHING
      RETURNING id
    `;
    const { rows } = await db.query(query, [username, bookUuid, cfiRange]);
    res.status(201).json({ success: true, highlight: rows[0] });
  } catch (err) {
    console.error('Error adding highlight:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET all highlights for a book for a user
app.get('/api/highlights/:username/:bookUuid', async (req, res) => {
  const { username, bookUuid } = req.params;
  try {
    const { rows: highlights } = await db.query(
      'SELECT * FROM highlights WHERE username = $1 AND book_uuid = $2 ORDER BY created_at ASC',
      [username, bookUuid]
    );
    res.json({ success: true, highlights });
  } catch (err) {
    console.error('Error fetching highlights:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE a highlight by its ID
app.delete('/api/highlights/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM highlights WHERE id = $1', [id]);
    if (result.rowCount > 0) {
      res.json({ success: true, message: 'Highlight deleted.' });
    } else {
      res.status(404).json({ success: false, error: 'Highlight not found.' });
    }
  } catch (err) {
    console.error(`Error deleting highlight ${id}:`, err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// DELETE a book
app.delete('/api/books/:uuid', async (req, res) => {
  const { uuid } = req.params;
  try {
    // We need to find the R2 path before deleting the database record
    const { rows } = await db.query(
      "SELECT r2_path FROM book_files WHERE book_uuid = $1",
      [uuid]
    );
    const bookFile = rows[0];

    if (bookFile) {
      // Delete from R2
      const s3Client = getS3Client();
      const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: bookFile.r2_path,
      });
      await s3Client.send(command);
    }

    // Delete from database (this will cascade and delete from book_files as well)
    const deleteResult = await db.query(
      "DELETE FROM books_v2 WHERE uuid = $1",
      [uuid]
    );

    if (deleteResult.rowCount > 0) {
      res.json({ success: true, message: 'Book deleted successfully.' });
    } else {
      res.status(404).json({ success: false, error: 'Book not found.' });
    }
  } catch (err) {
    console.error(`Error deleting book ${uuid}:`, err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});