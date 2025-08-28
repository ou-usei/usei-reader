import { Router } from 'express';
import multer from 'multer';
import * as bookService from '../services/book.service.js';

const router = Router();

// Multer setup for file uploads (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET /api/books
router.get('/', async (req, res) => {
  try {
    const books = await bookService.getAllBooks();
    res.json({ success: true, books });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/books/:uuid/view
router.get('/:uuid/view', async (req, res) => {
  const { uuid } = req.params;
  try {
    const url = await bookService.getBookViewUrl(uuid);
    res.json({ success: true, url });
  } catch (error) {
    if (error.message === 'Book not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    console.error(`Error getting view URL for book ${uuid}:`, error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/books/upload
router.post('/upload', upload.single('epub'), async (req, res) => {
  try {
    const createdBook = await bookService.createBook(req.file, req.body);
    res.status(201).json({ success: true, book: createdBook });
  } catch (error) {
    if (error.message === 'EPUB file not provided.') {
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error('Error during upload:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE /api/books/:uuid
router.delete('/:uuid', async (req, res) => {
  const { uuid } = req.params;
  try {
    await bookService.deleteBook(uuid);
    res.json({ success: true, message: 'Book deleted successfully.' });
  } catch (error) {
    // Prisma's delete throws an error if the record is not found
    if (error.code === 'P2025') {
       return res.status(404).json({ success: false, error: 'Book not found.' });
    }
    console.error(`Error deleting book ${uuid}:`, error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
