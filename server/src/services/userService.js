import * as bcrypt from 'bcrypt';
import * as userDal from '../dal/userDal.js';

const SALT_ROUNDS = 10;

/**
 * Registers a new user.
 * @param {string} email - The user's email.
 * @param {string} password - The user's plain text password.
 * @returns {Promise<User>} The newly created user object.
 * @throws {Error} If the user already exists.
 */
export const registerUser = async (email, password) => {
  // Business logic: Check if user already exists
  const existingUser = await userDal.findUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  // Business logic: Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Data access call
  const newUser = await userDal.createUser({ email, passwordHash });
  
  // Exclude password hash from the returned object
  delete newUser.passwordHash;
  
  return newUser;
};

/**
 * Authenticates a user.
 * @param {string} email - The user's email.
 * @param {string} password - The user's plain text password.
 * @returns {Promise<User|null>} The user object if authentication is successful, otherwise null.
 */
export const loginUser = async (email, password) => {
    const user = await userDal.findUserByEmail(email);
    if (!user) {
        return null; // User not found
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
        return null; // Passwords don't match
    }
    
    // Exclude password hash from the returned object
    delete user.passwordHash;
    return user;
}
