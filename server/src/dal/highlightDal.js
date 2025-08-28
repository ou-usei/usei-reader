import prisma from '../config/db.js';

/**
 * Gets all highlights for a specific user and book.
 * @param {number} userId - The user's ID.
 * @param {number} bookId - The book's ID.
 * @returns {Promise<Highlight[]>} An array of highlight objects.
 */
export const getHighlights = async (userId, bookId) => {
  return prisma.highlight.findMany({
    where: {
      userId,
      bookId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
};

/**
 * Creates a new highlight.
 * @param {object} data - The highlight data.
 * @param {number} data.userId - The user's ID.
 * @param {number} data.bookId - The book's ID.
 * @param {string} data.cfi_range - The CFI range of the highlight.
 * @returns {Promise<Highlight>} The newly created highlight object.
 */
export const createHighlight = async ({ userId, bookId, cfi_range }) => {
  return prisma.highlight.create({
    data: {
      userId,
      bookId,
      cfi_range,
    },
  });
};

/**
 * Deletes a highlight by its ID.
 * @param {number} id - The ID of the highlight to delete.
 * @returns {Promise<Highlight>} The deleted highlight object.
 */
export const deleteHighlight = async (id) => {
  return prisma.highlight.delete({
    where: { id },
  });
};
