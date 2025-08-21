const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
const database = getDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename but preserve the extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'book-' + uniqueSuffix + ext);
  }
});

// File filter to only allow epub files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/epub+zip' || 
      path.extname(file.originalname).toLowerCase() === '.epub') {
    cb(null, true);
  } else {
    cb(new Error('Only EPUB files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Epub Reader Demo Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      upload: 'POST /api/upload',
      books: '/api/books',
      bookFile: '/api/books/:id/file',
      progress: '/api/progress/:bookId',
      excerpts: '/api/excerpts/:bookId'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint for testing connection
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running and database is connected',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Users API endpoint
app.get('/api/users', (req, res) => {
  const usersPath = path.join(__dirname, 'users.json');
  fs.readFile(usersPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading users.json:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to read users file'
      });
    }
    try {
      const users = JSON.parse(data);
      res.json({
        success: true,
        users: users
      });
    } catch (parseErr) {
      console.error('Error parsing users.json:', parseErr);
      res.status(500).json({
        success: false,
        error: 'Failed to parse users file'
      });
    }
  });
});

// File upload endpoint
app.post('/api/upload', upload.single('epub'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded or invalid file type'
      });
    }

    // --- DEBUG LOGGING START ---
    console.log('--- UPLOAD DEBUG ---');
    console.log('req.file:', JSON.stringify(req.file, null, 2));
    // --- DEBUG LOGGING END ---

    const { originalname, filename: diskFilename, size } = req.file;
    
    // Decode originalname from the client to handle UTF-8 characters
    const originalName = Buffer.from(originalname, 'latin1').toString('utf8');
    
    // Extract basic metadata
    const title = req.body.title || path.basename(originalName, path.extname(originalName));
    const author = req.body.author || '未知作者';

    // --- DEBUG LOGGING START ---
    console.log('Data to be saved to DB:');
    console.log({ title, author, originalName, diskFilename });
    // --- DEBUG LOGGING END ---
    
    // Save book metadata to database
    // originalName is for display, diskFilename is the actual file on disk
    const book = await database.createBook(title, author, originalName, diskFilename);
    
    console.log(`📚 Uploaded book: ${title} by ${author} (${(size / 1024 / 1024).toFixed(2)}MB)`);
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        filename: book.filename,
        originalName: originalName,
        size: size,
        uploadDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if database save failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

// Books API endpoints
app.get('/api/books', async (req, res) => {
  try {
    const books = await database.getAllBooks();
    res.json({
      success: true,
      books: books
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch books',
      message: error.message
    });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await database.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }
    res.json({
      success: true,
      book: book
    });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch book',
      message: error.message
    });
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await database.getBookById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    // Delete the physical file
    const filePath = path.join(uploadsDir, book.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the book from the database
    await database.deleteBook(bookId);

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete book',
      message: error.message
    });
  }
});

// File download endpoint
app.get('/api/books/:id/file', async (req, res) => {
  try {
    const book = await database.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    // --- DEBUG LOGGING START ---
    console.log('--- DOWNLOAD DEBUG ---');
    console.log('Book data from DB:', JSON.stringify(book, null, 2));
    // --- DEBUG LOGGING END ---

    const filePath = path.join(uploadsDir, book.file_path);
    
    // --- DEBUG LOGGING START ---
    console.log('Checking for file at path:', filePath);
    // --- DEBUG LOGGING END ---

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // --- DEBUG LOGGING START ---
      console.error('File not found at path:', filePath);
      // --- DEBUG LOGGING END ---
      return res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

    // Set appropriate headers for epub download with proper encoding for Chinese filenames
    res.setHeader('Content-Type', 'application/epub+zip');
    
    // Encode filename properly for Chinese characters using RFC 5987
    const encodedFilename = encodeURIComponent(book.filename);
    const asciiFilename = book.filename.replace(/[^\x00-\x7F]/g, "_"); // Fallback for old browsers
    
    res.setHeader('Content-Disposition', 
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to stream file'
        });
      }
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      message: error.message
    });
  }
});

// File view endpoint for the reader
app.get('/api/books/:id/view', async (req, res) => {
  try {
    const book = await database.getBookById(req.params.id);
    if (!book) {
      return res.status(404).send('Book not found');
    }

    const filePath = path.join(uploadsDir, book.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found on server');
    }

    res.setHeader('Content-Type', 'application/epub+zip');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving file for view:', error);
    res.status(500).send('Failed to serve file');
  }
});

// Reading Progress API endpoints
app.get('/api/progress/:username/:bookId', async (req, res) => {
  try {
    const { username, bookId } = req.params;
    const progress = await database.getProgress(username, bookId);
    res.json({
      success: true,
      progress: progress
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress',
      message: error.message
    });
  }
});

app.post('/api/progress/:username/:bookId', async (req, res) => {
  try {
    const { username, bookId } = req.params;
    const { currentCfi, progressPercentage } = req.body;
    
    if (!currentCfi && progressPercentage === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing progress data (currentCfi or progressPercentage)'
      });
    }

    const progress = await database.saveProgress(
      username,
      bookId,
      currentCfi,
      progressPercentage
    );
    res.json({
      success: true,
      progress: progress
    });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save progress',
      message: error.message
    });
  }
});

// Excerpts API endpoints
app.get('/api/excerpts/:bookId', async (req, res) => {
  try {
    const excerpts = await database.getExcerptsByBookId(req.params.bookId);
    res.json({
      success: true,
      excerpts: excerpts
    });
  } catch (error) {
    console.error('Error fetching excerpts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch excerpts',
      message: error.message
    });
  }
});

app.post('/api/excerpts', async (req, res) => {
  try {
    const { bookId, content, cfiRange, note } = req.body;
    const excerpt = await database.createExcerpt(bookId, content, cfiRange, note);
    res.json({
      success: true,
      excerpt: excerpt
    });
  } catch (error) {
    console.error('Error creating excerpt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create excerpt',
      message: error.message
    });
  }
});

app.get('/api/excerpts', async (req, res) => {
  try {
    const excerpts = await database.getAllExcerpts();
    res.json({
      success: true,
      excerpts: excerpts
    });
  } catch (error) {
    console.error('Error fetching all excerpts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch excerpts',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Get local IP address for network access
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('=================================');
  console.log('📚 Epub Reader Demo Server');
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🏠 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://${localIP}:${PORT}`);
  console.log('=================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  const { closeDatabase } = require('./database');
  closeDatabase();
  process.exit(0);
});

module.exports = app;