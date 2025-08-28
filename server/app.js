// server/app.js
import 'dotenv/config'; // Load .env file
import express from 'express';
import cors from 'cors';
import multer from 'multer';

// Import routers
import userRoutes from './src/routes/userRoutes.js';
import bookRoutes from './src/routes/bookRoutes.js';
import progressRoutes from './src/routes/progressRoutes.js';
import highlightRoutes from './src/routes/highlightRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // for parsing application/json

// Custom middleware to set cache-control headers for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// --- API Routes ---
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/highlights', highlightRoutes);

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
