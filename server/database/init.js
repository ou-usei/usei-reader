const Database = require('./db');
const path = require('path');
const fs = require('fs');

class DatabaseInitializer {
  constructor() {
    this.db = new Database();
  }

  async initializeWithSeedData() {
    try {
      console.log('Starting database initialization with seed data...');
      
      // Wait a moment for tables to be created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we already have data
      const existingBooks = await this.db.getAllBooks();
      if (existingBooks.length > 0) {
        console.log('Database already contains data, skipping seed data insertion');
        return;
      }

      // Create sample books
      const sampleBooks = [
        {
          title: '示例电子书 1',
          author: '作者甲',
          filename: 'sample-book-1.epub',
          filePath: '/uploads/sample-book-1.epub'
        },
        {
          title: 'Sample English Book',
          author: 'John Doe',
          filename: 'sample-book-2.epub',
          filePath: '/uploads/sample-book-2.epub'
        },
        {
          title: '测试书籍',
          author: '测试作者',
          filename: 'test-book.epub',
          filePath: '/uploads/test-book.epub'
        }
      ];

      console.log('Inserting sample books...');
      const createdBooks = [];
      for (const book of sampleBooks) {
        try {
          const createdBook = await this.db.createBook(
            book.title,
            book.author,
            book.filename,
            book.filePath
          );
          createdBooks.push(createdBook);
          console.log(`Created book: ${book.title}`);
        } catch (error) {
          console.error(`Error creating book ${book.title}:`, error.message);
        }
      }

      // Create sample reading progress
      if (createdBooks.length > 0) {
        console.log('Creating sample reading progress...');
        try {
          await this.db.saveProgress(createdBooks[0].id, 'epubcfi(/6/4[chapter01]!/4/2/2[p001]/1:0)', 15.5);
          console.log('Created sample progress for first book');
        } catch (error) {
          console.error('Error creating sample progress:', error.message);
        }

        // Create sample excerpts
        console.log('Creating sample excerpts...');
        const sampleExcerpts = [
          {
            bookId: createdBooks[0].id,
            content: '这是一段示例摘录文本，用于测试摘录功能。',
            cfiRange: 'epubcfi(/6/4[chapter01]!/4/2/2[p001]/1:10,/1:25)',
            note: '这是一个测试笔记'
          },
          {
            bookId: createdBooks[0].id,
            content: '另一段重要的文本内容，值得记录和回顾。',
            cfiRange: 'epubcfi(/6/6[chapter02]!/4/2/4[p002]/1:0,/1:15)',
            note: '重要概念'
          }
        ];

        for (const excerpt of sampleExcerpts) {
          try {
            await this.db.createExcerpt(
              excerpt.bookId,
              excerpt.content,
              excerpt.cfiRange,
              excerpt.note
            );
            console.log('Created sample excerpt');
          } catch (error) {
            console.error('Error creating sample excerpt:', error.message);
          }
        }
      }

      console.log('Database initialization completed successfully!');
      
    } catch (error) {
      console.error('Error during database initialization:', error.message);
    }
  }

  async resetDatabase() {
    try {
      console.log('Resetting database...');
      
      // Clear all tables
      await new Promise((resolve, reject) => {
        this.db.getDb().run('DELETE FROM excerpts', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        this.db.getDb().run('DELETE FROM reading_progress', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        this.db.getDb().run('DELETE FROM books', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log('Database reset completed');
      
    } catch (error) {
      console.error('Error resetting database:', error.message);
    }
  }

  close() {
    this.db.close();
  }
}

// If this script is run directly
if (require.main === module) {
  const initializer = new DatabaseInitializer();
  
  const command = process.argv[2];
  
  if (command === 'reset') {
    initializer.resetDatabase().then(() => {
      initializer.close();
      process.exit(0);
    });
  } else {
    initializer.initializeWithSeedData().then(() => {
      initializer.close();
      process.exit(0);
    });
  }
}

module.exports = DatabaseInitializer;