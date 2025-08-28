import prisma from '../config/db.js';

/**
 * Finds a user by their email address.
 * @param {string} email - The email of the user to find.
 * @returns {Promise<User|null>} The user object or null if not found.
 */
export const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

/**
 * Creates a new user in the database.
 * @param {object} userData - The user data.
 * @param {string} userData.email - The user's email.
 * @param {string} userData.passwordHash - The hashed password for the user.
 * @returns {Promise<User>} The newly created user object.
 */
export const createUser = async ({ email, passwordHash }) => {
  return prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });
};
