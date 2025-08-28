import { Router } from 'express';
import * as progressService from '../services/progressService.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Apply the authentication middleware to all routes in this file
router.use(protect);

// GET /api/progress/:bookId
// Retrieves the reading progress for the authenticated user and a specific book.
router.get('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id; // Get user ID from the token payload
    const progress = await progressService.getReadingProgress(userId, parseInt(bookId));

    if (progress) {
      res.json({ success: true, progress });
    } else {
      res.status(404).json({ success: false, error: 'No progress found for this book.' });
    }
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/progress/:bookId
// Saves (creates or updates) the reading progress for the authenticated user.
router.post('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    const { current_cfi, progress_percentage } = req.body;

    if (!current_cfi) {
      return res.status(400).json({ success: false, error: 'current_cfi is required.' });
    }

    const savedProgress = await progressService.saveReadingProgress({
      userId: userId,
      bookId: parseInt(bookId),
      current_cfi,
      progress_percentage: progress_percentage || 0,
    });

    res.status(200).json({ success: true, progress: savedProgress });
  } catch (error) {
    console.error('Error saving reading progress:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
