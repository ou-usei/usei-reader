import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reader from './components/Reader';
import BookDetails from './components/BookDetails';
import Settings from './pages/Settings'; // Import the new Settings component

// Debounce function to limit how often a function is called
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
};

function App() {
  // State for app status and data
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [progressData, setProgressData] = useState({});
  const [uploadMessage, setUploadMessage] = useState('');

  // State for navigation/views
  const [view, setView] = useState('dashboard'); // 'dashboard', 'reader', 'details', 'settings'
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
        const progressMap = data.progress.reduce((acc, p) => {
          acc[p.book_uuid] = p;
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


  // --- EVENT HANDLERS & STATE MANAGEMENT ---

  const handleProgressUpdate = useCallback(async (bookUuid, cfi) => {
    if (!currentUser) return;

    // 1. Update local state immediately for a responsive UI
    setProgressData(prevProgress => ({
      ...prevProgress,
      [bookUuid]: {
        ...prevProgress[bookUuid],
        current_cfi: cfi,
        book_uuid: bookUuid,
        username: currentUser.username,
      }
    }));

    // 2. Persist the change to the backend and RETURN THE PROMISE
    try {
      return await fetch(`/api/progress/${currentUser.username}/${bookUuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentCfi: cfi })
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
      // In case of error, return a rejected promise
      return Promise.reject(err);
    }
  }, [currentUser]);

  const handleUserChange = (event) => {
    const selectedUsername = event.target.value;
    const user = users.find(u => u.username === selectedUsername);
    setCurrentUser(user);
  };

  const handleDeleteBook = async (bookUuid) => {
    try {
      const response = await fetch(`/api/books/${bookUuid}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setUploadMessage(`✅ Book has been deleted.`);
        setView('dashboard');
        setSelectedBook(null);
        await loadBooks(); // Refresh book list
        // Also remove progress for the deleted book
        setProgressData(prev => {
          const newProgress = { ...prev };
          delete newProgress[bookUuid];
          return newProgress;
        });
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

  const handleBackToDashboard = async () => {
    setSelectedBook(null);
    setView('dashboard');
    // CRITICAL: We have just saved the latest progress to the database.
    // To defeat the state update race condition, we must re-fetch the
    // "source of truth" to ensure the UI is perfectly in sync.
    if (currentUser) {
      await loadProgressForUser(currentUser.username);
    }
  };

  const handleNavigate = (page) => {
    setView(page);
  };

  // --- RENDER LOGIC ---

  const renderContent = () => {
    switch (view) {
      case 'reader':
        if (!selectedBook || !currentUser) return null;
        const initialCfi = progressData[selectedBook.uuid]?.current_cfi;
        return (
          <Reader 
            book={selectedBook} 
            currentUser={currentUser} 
            initialCfi={initialCfi}
            onProgressUpdate={handleProgressUpdate}
            onBack={handleBackToDashboard} 
          />
        );
      case 'details':
        return selectedBook ? <BookDetails book={selectedBook} onBack={handleBackToDashboard} onDelete={handleDeleteBook} /> : null;
      case 'settings':
        return <Settings users={users} currentUser={currentUser} onUserChange={handleUserChange} />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            books={books}
            currentUser={currentUser}
            progressData={progressData}
            uploadMessage={uploadMessage}
            setUploadMessage={setUploadMessage}
            onReadBook={handleSelectBookForReading}
            onShowDetails={handleSelectBookForDetails}
            refreshBooks={loadBooks}
          />
        );
    }
  };

  if (view === 'reader') {
    return renderContent();
  }

  return (
    <Layout currentPage={view} onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
  );
}

export default App;