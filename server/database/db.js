const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in server directory
const dbPath = path.join(__dirname, 'epub_reader.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database at:', dbPath);
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    // Create books table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating books table:', err.message);
      } else {
        console.log('Books table ready');
      }
    });

    // Create reading_progress table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER,
        current_cfi TEXT,
        progress_percentage REAL DEFAULT 0,
        last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating reading_progress table:', err.message);
      } else {
        console.log('Reading progress table ready');
      }
    });

    // Create excerpts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS excerpts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER,
        content TEXT NOT NULL,
        cfi_range TEXT,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating excerpts table:', err.message);
      } else {
        console.log('Excerpts table ready');
      }
    });
  }

  getDb() {
    return this.db;
  }

  // Books CRUD operations
  createBook(title, author, filename, filePath) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO books (title, author, filename, file_path)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run([title, author, filename, filePath], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, title, author, filename, filePath });
        }
      });
      
      stmt.finalize();
    });
  }

  getAllBooks() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM books ORDER BY upload_date DESC', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getBookById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM books WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  deleteBook(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM books WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Reading Progress CRUD operations
  saveProgress(bookId, currentCfi, progressPercentage) {
    return new Promise((resolve, reject) => {
      // First check if progress exists for this book
      this.db.get('SELECT id FROM reading_progress WHERE book_id = ?', [bookId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Update existing progress
          this.db.run(`
            UPDATE reading_progress 
            SET current_cfi = ?, progress_percentage = ?, last_read_at = CURRENT_TIMESTAMP
            WHERE book_id = ?
          `, [currentCfi, progressPercentage, bookId], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: row.id, bookId, currentCfi, progressPercentage });
            }
          });
        } else {
          // Create new progress record
          this.db.run(`
            INSERT INTO reading_progress (book_id, current_cfi, progress_percentage)
            VALUES (?, ?, ?)
          `, [bookId, currentCfi, progressPercentage], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: this.lastID, bookId, currentCfi, progressPercentage });
            }
          });
        }
      });
    });
  }

  getProgress(bookId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM reading_progress WHERE book_id = ?', [bookId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Excerpts CRUD operations
  createExcerpt(bookId, content, cfiRange, note = '') {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO excerpts (book_id, content, cfi_range, note)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run([bookId, content, cfiRange, note], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, bookId, content, cfiRange, note });
        }
      });
      
      stmt.finalize();
    });
  }

  getExcerptsByBookId(bookId) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM excerpts WHERE book_id = ? ORDER BY created_at DESC', [bookId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getAllExcerpts() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT e.*, b.title as book_title, b.author as book_author
        FROM excerpts e
        JOIN books b ON e.book_id = b.id
        ORDER BY e.created_at DESC
      `, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  updateExcerpt(id, content, note) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE excerpts 
        SET content = ?, note = ?
        WHERE id = ?
      `, [content, note, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  deleteExcerpt(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM excerpts WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = Database;