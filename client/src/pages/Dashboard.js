import React, { useState } from 'react';
import { Button } from "../components/ui/button";

function Dashboard({
  books,
  currentUser,
  progressData,
  uploadMessage,
  setUploadMessage,
  onReadBook,
  onShowDetails,
  refreshBooks
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.epub')) {
      setUploadMessage('Please select an .epub file');
      return;
    }

    setUploading(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('epub', file);
    formData.append('title', file.name.replace('.epub', ''));
    formData.append('author', 'Unknown Author');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        setUploadMessage(`✅ Upload successful: ${result.book.title}`);
        refreshBooks();
        event.target.value = '';
      } else {
        setUploadMessage(`❌ Upload failed: ${result.error}`);
      }
    } catch (error) {
      setUploadMessage(`❌ Upload error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US');
  };

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your e-book library.</p>
        </div>
        {currentUser && (
          <div>
            <h2 className="text-xl font-semibold text-right">
              Welcome, {currentUser.displayName}
            </h2>
          </div>
        )}
      </header>

      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Upload E-Book</h2>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".epub"
            onChange={handleFileUpload}
            disabled={uploading}
            id="epub-upload"
            className="hidden"
          />
          <label htmlFor="epub-upload">
            <Button asChild disabled={uploading}>
              <span>{uploading ? 'Uploading...' : 'Choose EPUB File'}</span>
            </Button>
          </label>
          {uploadMessage && (
            <div className={`p-2 rounded-md ${uploadMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {uploadMessage}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">My Library ({books.length})</h2>
        {books.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No books uploaded yet.</p>
            <p>Click the button above to upload your first EPUB e-book.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map(book => {
              const hasProgress = progressData[book.id];
              return (
                <div key={book.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2">{book.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Author: {book.author}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate">File: {book.filename}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Uploaded: {formatDate(book.upload_date)}</p>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      onClick={() => onReadBook(book)} 
                      className={`flex-1 ${hasProgress ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      variant={hasProgress ? 'default' : 'secondary'}
                    >
                      {hasProgress ? '继续阅读' : '开始阅读'}
                    </Button>
                    <Button onClick={() => onShowDetails(book)} variant="outline" className="flex-1">详情</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;