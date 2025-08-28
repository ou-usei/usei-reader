import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser } from '../services/userService.js';

const router = Router();

// POST /api/users/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  try {
    const newUser = await registerUser(email, password);
    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    // Check for specific error from the service
    if (error.message === 'User with this email already exists.') {
      return res.status(409).json({ success: false, error: error.message });
    }
    console.error('Error during user registration:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
        const user = await loginUser(email, password);

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        }

        // Create JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ success: true, token, user: { id: user.id, email: user.email } });

    } catch (error) {
        console.error('Error during user login:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


export default router;
