import { Router } from 'express';
import * as highlightService from '../services/highlightService.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

// GET /api/highlights/:bookId
router.get('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    const highlights = await highlightService.getHighlightsForBook(userId, parseInt(bookId));
    res.json({ success: true, highlights });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/highlights
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId, cfi_range, note } = req.body;
    if (!bookId || !cfi_range) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    const newHighlight = await highlightService.addHighlight({ userId, bookId, cfi_range, note });
    res.status(201).json({ success: true, highlight: newHighlight });
  } catch (error) {
    console.error('Error adding highlight:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE /api/highlights/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    // Pass userId to service for authorization check in a real app
    await highlightService.removeHighlight(parseInt(id), userId);
    res.json({ success: true, message: 'Highlight deleted.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Highlight not found.' });
    }
    console.error(`Error deleting highlight ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
