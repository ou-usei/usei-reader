import React, { useEffect } from 'react';
import useAuthStore from './stores/authStore';
import useViewStore from './stores/viewStore';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reader from './components/Reader';
import BookDetails from './components/BookDetails';
import Settings from './pages/Settings';
import Auth from './pages/Auth';

function App() {
  const { token, isLoading, initialize } = useAuthStore();
  const { view, selectedBook, setView, setSelectedBook } = useViewStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!token) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (view) {
      case 'reader':
        return (
          <Reader 
            book={selectedBook} 
            onBack={() => {
              setSelectedBook(null);
              setView('dashboard');
            }} 
          />
        );
      case 'details':
        return <BookDetails 
                  book={selectedBook} 
                  onBack={() => {
                    setSelectedBook(null);
                    setView('dashboard');
                  }} 
                />;
      case 'settings':
        return <Settings onNavigate={setView} />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            onReadBook={(book) => {
              setSelectedBook(book);
              setView('reader');
            }}
            onShowDetails={(book) => {
              setSelectedBook(book);
              setView('details');
            }}
          />
        );
    }
  };

  if (view === 'reader') {
    return renderContent();
  }

  return (
    <Layout onNavigate={setView} currentPage={view}>
      {renderContent()}
    </Layout>
  );
}

export default App;
