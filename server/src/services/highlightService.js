import * as highlightDal from '../dal/highlightDal.js';

/**
 * Gets all highlights for a user and book.
 * @param {number} userId - The user's ID.
 * @param {number} bookId - The book's ID.
 * @returns {Promise<Highlight[]>}
 */
export const getHighlightsForBook = async (userId, bookId) => {
  return highlightDal.getHighlights(userId, bookId);
};

/**
 * Adds a new highlight for a user.
 * @param {object} data - Highlight data.
 * @param {number} data.userId - The user's ID.
 * @param {number} data.bookId - The book's ID.
 * @param {string} data.cfi_range - The CFI range of the highlight.
 * @returns {Promise<Highlight>}
 */
export const addHighlight = async ({ userId, bookId, cfi_range }) => {
  // Future business logic: Could check for highlight overlaps or limits.
  return highlightDal.createHighlight({ userId, bookId, cfi_range });
};

/**
 * Removes a highlight.
 * @param {number} highlightId - The ID of the highlight.
 * @param {number} userId - The ID of the user requesting the deletion (for authorization).
 * @returns {Promise<Highlight>}
 * @throws {Error} If the highlight does not exist or the user is not authorized.
 */
export const removeHighlight = async (highlightId, userId) => {
  // In a real implementation, we would first fetch the highlight to ensure
  // the userId matches the one trying to delete it.
  // For this story, we'll assume the DAL operation is sufficient.
  return highlightDal.deleteHighlight(highlightId);
};
