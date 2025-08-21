import React, { useState, useEffect } from 'react';
import Reader from './components/Reader'; // Import the new Reader component
import './App.css';

function App() {
  const [serverStatus, setServerStatus] = useState('checking');
  const [serverMessage, setServerMessage] = useState('');
  const [books, setBooks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedBook, setSelectedBook] = useState(null); // State to manage the selected book
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Test server connection
    fetch('/api/health')
      .then(response => response.json())
      .then(data => {
        setServerStatus('connected');
        setServerMessage(data.message || 'Server connected successfully');
        // Load books and users after connection is confirmed
        loadBooks();
        loadUsers();
      })
      .catch(error => {
        setServerStatus('error');
        setServerMessage('Failed to connect to server: ' + error.message);
      });
  }, []);

  const loadBooks = async () => {
    try {
      const response = await fetch('/api/books');
      const data = await response.json();
      if (data.success) {
        setBooks(data.books);
      }
    } catch (error) {
      console.error('Failed to load books:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success && data.users.length > 0) {
        setUsers(data.users);
        setCurrentUser(data.users[0]); // Set the first user as the default
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleUserChange = (event) => {
    const selectedUsername = event.target.value;
    const user = users.find(u => u.username === selectedUsername);
    setCurrentUser(user);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.epub')) {
      setUploadMessage('请选择 .epub 文件');
      return;
    }

    setUploading(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('epub', file);
    formData.append('title', file.name.replace('.epub', ''));
    formData.append('author', '未知作者');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setUploadMessage(`✅ 上传成功: ${result.book.title}`);
        loadBooks(); // Reload books list
        event.target.value = ''; // Clear file input
      } else {
        setUploadMessage(`❌ 上传失败: ${result.error}`);
      }
    } catch (error) {
      setUploadMessage(`❌ 上传错误: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (bookId, filename) => {
    try {
      setUploadMessage(`📥 开始下载: ${filename}...`);
      const response = await fetch(`/api/books/${bookId}/file`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `服务器错误，状态码: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up the temporary URL and link
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      setUploadMessage(`✅ 下载完成: ${filename}`);

    } catch (error) {
      console.error('Download failed:', error);
      setUploadMessage(`❌ 下载失败: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // If a book is selected, render the Reader component
  if (selectedBook) {
    return <Reader book={selectedBook} currentUser={currentUser} onBack={() => setSelectedBook(null)} />;
  }

  // Otherwise, render the main library view
  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>📚 Epub Reader Demo</h1>
          <p>上传和管理你的电子书</p>
          {currentUser && (
            <div className="user-selection">
              <span>当前用户: <strong>{currentUser.displayName}</strong></span>
              <select onChange={handleUserChange} value={currentUser.username}>
                {users.map(user => (
                  <option key={user.username} value={user.username}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        <div className="connection-test">
          <h2>🔗 服务器连接状态</h2>
          <div className={`status-indicator ${
            serverStatus === 'connected' ? 'status-success' : 
            serverStatus === 'error' ? 'status-error' : ''
          }`}>
            <strong>状态:</strong> {serverStatus === 'checking' ? '检查中...' : 
              serverStatus === 'connected' ? '已连接' : '连接失败'}
            <br />
            <strong>信息:</strong> {serverMessage}
          </div>
        </div>

        {serverStatus === 'connected' && (
          <>
            <div className="upload-section">
              <h2>📤 上传电子书</h2>
              <div className="upload-area">
                <input
                  type="file"
                  accept=".epub"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  id="epub-upload"
                  className="file-input"
                />
                <label htmlFor="epub-upload" className={`upload-button ${uploading ? 'uploading' : ''}`}>
                  {uploading ? '上传中...' : '选择 EPUB 文件'}
                </label>
                {uploadMessage && (
                  <div className={`upload-message ${uploadMessage.includes('✅') ? 'success' : 'error'}`}>
                    {uploadMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="books-section">
              <h2>📖 我的书库 ({books.length})</h2>
              {books.length === 0 ? (
                <div className="empty-state">
                  <p>还没有上传任何书籍</p>
                  <p>点击上方按钮上传你的第一本 EPUB 电子书</p>
                </div>
              ) : (
                <div className="books-grid">
                  {books.map(book => (
                    <div key={book.id} className="book-card">
                      <div className="book-info">
                        <h3 className="book-title">{book.title}</h3>
                        <p className="book-author">作者: {book.author}</p>
                        <p className="book-filename">文件: {book.filename}</p>
                        <p className="book-date">上传时间: {formatDate(book.upload_date)}</p>
                      </div>
                      <div className="book-actions">
                        <button 
                          className="read-btn"
                          onClick={() => setSelectedBook(book)}
                        >
                          📖 阅读
                        </button>
                        <button 
                          className="download-btn"
                          onClick={() => handleDownload(book.id, book.filename)}
                        >
                          📥 下载
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="features-info">
          <h2>✨ 当前功能</h2>
          <ul>
            <li>✅ 上传 EPUB 文件</li>
            <li>✅ 查看书籍列表</li>
            <li>✅ 下载已上传的书籍</li>
            <li>🔄 阅读进度保存 (后端已实现)</li>
            <li>🔄 文本摘录功能 (后端已实现)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;