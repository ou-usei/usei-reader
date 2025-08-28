// Import vitest functions
import { describe, it, expect, vi, afterEach } from 'vitest';

// Import modules to be tested/mocked
import { registerUser, loginUser } from '../../src/services/userService.js';
import * as userDal from '../../src/dal/userDal.js';
import * as bcrypt from 'bcrypt';

// 1. Use vi.mock - it's hoisted automatically and works seamlessly with ESM
vi.mock('../../src/dal/userDal.js');
vi.mock('bcrypt');

describe('User Service (Vitest)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashedpassword';

      // 2. Control the mocked functions - API is identical to Jest
      vi.mocked(userDal.findUserByEmail).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword);
      vi.mocked(userDal.createUser).mockResolvedValue({ id: 1, email, passwordHash: hashedPassword });

      const result = await registerUser(email, password);

      expect(userDal.findUserByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(userDal.createUser).toHaveBeenCalledWith({ email, passwordHash: hashedPassword });
      expect(result).toEqual({ id: 1, email });
    });

    it('should throw an error if user already exists', async () => {
      const email = 'exists@example.com';
      const password = 'password123';

      vi.mocked(userDal.findUserByEmail).mockResolvedValue({ id: 1, email });

      await expect(registerUser(email, password)).rejects.toThrow('User with this email already exists.');
      expect(userDal.findUserByEmail).toHaveBeenCalledWith(email);
      expect(userDal.createUser).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    it('should return user object on successful login', async () => {
        const email = 'test@example.com';
        const password = 'password123';
        const hashedPassword = 'hashedpassword';
        const user = { id: 1, email, passwordHash: hashedPassword };

        vi.mocked(userDal.findUserByEmail).mockResolvedValue(user);
        vi.mocked(bcrypt.compare).mockResolvedValue(true);

        const result = await loginUser(email, password);

        expect(userDal.findUserByEmail).toHaveBeenCalledWith(email);
        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
        expect(result).toEqual({ id: 1, email });
    });

    it('should return null if user not found', async () => {
        const email = 'nonexistent@example.com';
        const password = 'password123';

        vi.mocked(userDal.findUserByEmail).mockResolvedValue(null);

        const result = await loginUser(email, password);

        expect(result).toBeNull();
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password does not match', async () => {
        const email = 'test@example.com';
        const password = 'wrongpassword';
        const hashedPassword = 'hashedpassword';
        const user = { id: 1, email, passwordHash: hashedPassword };

        vi.mocked(userDal.findUserByEmail).mockResolvedValue(user);
        vi.mocked(bcrypt.compare).mockResolvedValue(false);

        const result = await loginUser(email, password);

        expect(result).toBeNull();
    });
  });
});
