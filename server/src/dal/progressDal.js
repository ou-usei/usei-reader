import prisma from '../config/db.js';

/**
 * Retrieves the reading progress for a specific user and book.
 * @param {number} userId - The ID of the user.
 * @param {number} bookId - The ID of the book.
 * @returns {Promise<ReadingProgress|null>} The progress object or null if not found.
 */
export const getProgress = async (userId, bookId) => {
  return prisma.readingProgress.findUnique({
    where: {
      userId_bookId: {
        userId,
        bookId,
      },
    },
  });
};

/**
 * Creates or updates the reading progress for a user and book.
 * @param {object} data - The progress data.
 * @param {number} data.userId - The ID of the user.
 * @param {number} data.bookId - The ID of the book.
 * @param {string} data.current_cfi - The current CFI location.
 * @param {number} data.progress_percentage - The reading progress percentage.
 * @returns {Promise<ReadingProgress>} The created or updated progress object.
 */
export const upsertProgress = async ({ userId, bookId, current_cfi, progress_percentage }) => {
  return prisma.readingProgress.upsert({
    where: {
      userId_bookId: {
        userId,
        bookId,
      },
    },
    update: {
      current_cfi,
      progress_percentage,
      last_read_at: new Date(),
    },
    create: {
      userId,
      bookId,
      current_cfi,
      progress_percentage,
    },
  });
};
