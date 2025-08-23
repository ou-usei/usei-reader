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
  const [uploadMessage, setUploadMessage] = useState('');

  // State for navigation/views
  const [view, setView] = useState('dashboard'); // 'dashboard', 'reader', 'details', 'settings'
  const [selectedBook, setSelectedBook] = useState(null);
  const [skipProgressLoad, setSkipProgressLoad] = useState(false);

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
        // 只在没有当前用户时设置默认用户
        setCurrentUser(prevUser => prevUser || data.users[0]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []); // 移除currentUser依赖，避免循环

  useEffect(() => {
    loadBooks();
    loadUsers();
  }, []); // 只在组件挂载时执行一次


  // --- EVENT HANDLERS & STATE MANAGEMENT ---

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
    
    // 暂时跳过Dashboard的进度加载，避免覆盖刚保存的进度
    setSkipProgressLoad(true);
    
    // 1秒后恢复正常的进度加载
    setTimeout(() => {
      setSkipProgressLoad(false);
    }, 1000);
  };

  const handleNavigate = (page) => {
    setView(page);
  };

  // --- RENDER LOGIC ---

  const renderContent = () => {
    switch (view) {
      case 'reader':
        if (!selectedBook || !currentUser) return null;
        return (
          <Reader 
            book={selectedBook} 
            currentUser={currentUser} 
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
            uploadMessage={uploadMessage}
            setUploadMessage={setUploadMessage}
            onReadBook={handleSelectBookForReading}
            onShowDetails={handleSelectBookForDetails}
            refreshBooks={loadBooks}
            skipProgressLoad={skipProgressLoad}
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