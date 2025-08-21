import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reader from './components/Reader';
import BookDetails from './components/BookDetails';

function App() {
  // State for app status and data
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [progressData, setProgressData] = useState({});
  const [uploadMessage, setUploadMessage] = useState('');

  // State for navigation/views
  const [view, setView] = useState('dashboard'); // 'dashboard', 'reader', 'details'
  const [selectedBook, setSelectedBook] = useState(null);

  // --- DATA FETCHING ---

  const loadBooks = useCallback(async () => {
    try {
      const response = await fetch('/api/books');
      const data = await response.json();
      if (data.success) setBooks(data.books);
    } catch (error) {
      console.error('Failed to load books:', error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success && data.users.length > 0) {
        setUsers(data.users);
        if (!currentUser) {
          setCurrentUser(data.users[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, [currentUser]);

  const loadProgressForUser = useCallback(async (username) => {
    if (!username) return;
    try {
      const response = await fetch(`/api/progress/${username}`);
      const data = await response.json();
      if (data.success) {
        // Convert array to a map for easy lookup: { bookId: progress }
        const progressMap = data.progress.reduce((acc, p) => {
          acc[p.book_id] = p;
          return acc;
        }, {});
        setProgressData(progressMap);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  }, []);

  useEffect(() => {
    loadBooks();
    loadUsers();
  }, [loadBooks, loadUsers]);

  useEffect(() => {
    if (currentUser) {
      loadProgressForUser(currentUser.username);
    }
  }, [currentUser, loadProgressForUser]);


  // --- EVENT HANDLERS ---

  const handleUserChange = (event) => {
    const selectedUsername = event.target.value;
    const user = users.find(u => u.username === selectedUsername);
    setCurrentUser(user);
  };

  const handleDeleteBook = async (bookId) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setUploadMessage(`✅ Book has been deleted.`);
        setView('dashboard');
        setSelectedBook(null);
        await loadBooks();
      } else {
        setUploadMessage(`❌ Delete failed: ${result.error}`);
      }
    } catch (error) {
      setUploadMessage(`❌ Delete error: ${error.message}`);
    }
  };

  const handleSelectBookForReading = (book) => {
    setSelectedBook(book);
    setView('reader');
  };
  
  const handleSelectBookForDetails = (book) => {
    setSelectedBook(book);
    setView('details');
  };

  const handleBackToDashboard = () => {
    setSelectedBook(null);
    setView('dashboard');
    // Refresh books in case progress was made
    if (currentUser) {
      loadProgressForUser(currentUser.username);
    }
  };

  // --- RENDER LOGIC ---

  if (view === 'reader' && selectedBook) {
    return <Reader book={selectedBook} currentUser={currentUser} onBack={handleBackToDashboard} />;
  }

  if (view === 'details' && selectedBook) {
    return (
      <Layout>
        <BookDetails book={selectedBook} onBack={handleBackToDashboard} onDelete={handleDeleteBook} />
      </Layout>
    );
  }

  return (
    <Layout>
      <Dashboard
        books={books}
        users={users}
        currentUser={currentUser}
        progressData={progressData}
        uploadMessage={uploadMessage}
        setUploadMessage={setUploadMessage}
        onUserChange={handleUserChange}
        onDeleteBook={handleDeleteBook}
        onReadBook={handleSelectBookForReading}
        onShowDetails={handleSelectBookForDetails}
        refreshBooks={loadBooks}
      />
    </Layout>
  );
}

export default App;