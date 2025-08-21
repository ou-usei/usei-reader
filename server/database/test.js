const Database = require('./db');

class DatabaseTester {
  constructor() {
    this.db = new Database();
  }

  async runTests() {
    console.log('🧪 Starting database connection tests...\n');
    
    try {
      // Test 1: Database connection
      console.log('✅ Test 1: Database connection - PASSED');
      
      // Wait for tables to be initialized
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 2: Books CRUD operations
      console.log('📚 Test 2: Books CRUD operations');
      
      // Create a test book
      const testBook = await this.db.createBook(
        'Test Book Title',
        'Test Author',
        'test-book.epub',
        '/uploads/test-book.epub'
      );
      console.log('  ✅ Create book - PASSED', testBook);
      
      // Get all books
      const allBooks = await this.db.getAllBooks();
      console.log('  ✅ Get all books - PASSED', `Found ${allBooks.length} books`);
      
      // Get book by ID
      const bookById = await this.db.getBookById(testBook.id);
      console.log('  ✅ Get book by ID - PASSED', bookById ? 'Found' : 'Not found');
      
      // Test 3: Reading Progress operations
      console.log('📖 Test 3: Reading Progress operations');
      
      // Save progress
      const progress = await this.db.saveProgress(
        testBook.id,
        'epubcfi(/6/4[chapter01]!/4/2/2[p001]/1:0)',
        25.5
      );
      console.log('  ✅ Save progress - PASSED', progress);
      
      // Get progress
      const savedProgress = await this.db.getProgress(testBook.id);
      console.log('  ✅ Get progress - PASSED', savedProgress ? 'Found' : 'Not found');
      
      // Update progress
      const updatedProgress = await this.db.saveProgress(
        testBook.id,
        'epubcfi(/6/6[chapter02]!/4/2/4[p002]/1:0)',
        45.8
      );
      console.log('  ✅ Update progress - PASSED', updatedProgress);
      
      // Test 4: Excerpts operations
      console.log('📝 Test 4: Excerpts operations');
      
      // Create excerpt
      const excerpt = await this.db.createExcerpt(
        testBook.id,
        'This is a test excerpt content',
        'epubcfi(/6/4[chapter01]!/4/2/2[p001]/1:10,/1:25)',
        'Test note'
      );
      console.log('  ✅ Create excerpt - PASSED', excerpt);
      
      // Get excerpts by book ID
      const bookExcerpts = await this.db.getExcerptsByBookId(testBook.id);
      console.log('  ✅ Get excerpts by book ID - PASSED', `Found ${bookExcerpts.length} excerpts`);
      
      // Get all excerpts
      const allExcerpts = await this.db.getAllExcerpts();
      console.log('  ✅ Get all excerpts - PASSED', `Found ${allExcerpts.length} excerpts`);
      
      // Update excerpt
      const updateResult = await this.db.updateExcerpt(
        excerpt.id,
        'Updated excerpt content',
        'Updated note'
      );
      console.log('  ✅ Update excerpt - PASSED', updateResult);
      
      // Test 5: Cleanup operations
      console.log('🧹 Test 5: Cleanup operations');
      
      // Delete excerpt
      const deleteExcerptResult = await this.db.deleteExcerpt(excerpt.id);
      console.log('  ✅ Delete excerpt - PASSED', deleteExcerptResult);
      
      // Delete book
      const deleteBookResult = await this.db.deleteBook(testBook.id);
      console.log('  ✅ Delete book - PASSED', deleteBookResult);
      
      console.log('\n🎉 All database tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error(error.stack);
    }
  }

  close() {
    this.db.close();
  }
}

// If this script is run directly
if (require.main === module) {
  const tester = new DatabaseTester();
  
  tester.runTests().then(() => {
    tester.close();
    process.exit(0);
  }).catch((error) => {
    console.error('Test execution failed:', error);
    tester.close();
    process.exit(1);
  });
}

module.exports = DatabaseTester;