import * as progressDal from '../dal/progressDal.js';
// In the future, we might add bookDal to validate book existence
// import * as bookDal from '../dal/book.dal.js';

/**
 * Gets the reading progress for a user and book.
 * @param {number} userId - The user's ID.
 * @param {number} bookId - The book's ID.
 * @returns {Promise<ReadingProgress|null>}
 */
export const getReadingProgress = async (userId, bookId) => {
  // Future business logic: check if book exists and user has access
  return progressDal.getProgress(userId, bookId);
};

/**
 * Saves (creates or updates) the reading progress for a user.
 * @param {object} data - Progress data.
 * @param {number} data.userId - The user's ID.
 * @param {number} data.bookId - The book's ID.
 * @param {string} data.current_cfi - The current CFI location.
 * @param {number} data.progress_percentage - The progress percentage.
 * @returns {Promise<ReadingProgress>}
 */
export const saveReadingProgress = async ({ userId, bookId, current_cfi, progress_percentage }) => {
  // Future business logic: validate CFI format or percentage range
  return progressDal.upsertProgress({ userId, bookId, current_cfi, progress_percentage });
};
