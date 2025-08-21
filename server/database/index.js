const Database = require('./db');
const DatabaseInitializer = require('./init');
const DatabaseTester = require('./test');

// Create a singleton instance
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  Database,
  DatabaseInitializer,
  DatabaseTester,
  getDatabase,
  closeDatabase
};