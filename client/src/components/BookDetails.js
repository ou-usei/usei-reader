import React from 'react';
import './BookDetails.css';

const BookDetails = ({ book, onBack, onDelete }) => {

  const handleDelete = () => {
    // Show a confirmation dialog before deleting
    if (window.confirm(`Are you sure you want to delete "${book.title}"? This action cannot be undone.`)) {
      onDelete(book.id);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="book-details-container">
      <div className="book-details-header">
        <button className="back-button" onClick={onBack}>←</button>
        <h1>{book.title}</h1>
      </div>
      <div className="book-details-content">
        <div className="book-info-panel">
          <h2>书籍信息</h2>
          <p><strong>作者:</strong> {book.author}</p>
          <p><strong>文件名:</strong> {book.filename}</p>
          <p><strong>上传时间:</strong> {formatDate(book.upload_date)}</p>
        </div>
        <div className="book-actions-panel">
          <h2>操作</h2>
          <button className="delete-button" onClick={handleDelete}>
            删除书籍
          </button>
          <p className="delete-warning">
            注意：删除操作将会从服务器永久移除该书籍文件，且无法恢复。
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
