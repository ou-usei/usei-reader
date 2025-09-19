import React, { useState, useEffect } from 'react';
import useBookStore from '../stores/bookStore';
import * as api from '../utils/api';
import HighlightList from './HighlightList';
import './BookDetails.css';

const BookDetails = ({ book, onBack }) => {
  const { deleteBook, isLoading } = useBookStore();
  const [highlights, setHighlights] = useState([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        setLoadingHighlights(true);
        const fetchedHighlights = await api.getHighlights(book.id);
        setHighlights(fetchedHighlights);
      } catch (error) {
        console.error("Failed to fetch highlights:", error);
      } finally {
        setLoadingHighlights(false);
      }
    };

    fetchHighlights();
  }, [book.id]);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${book.title}"? This action cannot be undone.`)) {
      await deleteBook(book.uuid);
      onBack(); // Go back to the dashboard after deletion
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US');
  };

  return (
    <div className="book-details-container">
      <div className="book-details-header">
        <button className="back-button" onClick={onBack}>←</button>
        <h1>{book.title}</h1>
      </div>
      <div className="book-details-content">
        <div className="book-info-panel">
          <h2>Book Information</h2>
          <p><strong>Author:</strong> {book.author}</p>
          <p><strong>Filename:</strong> {book.original_filename}</p>
          <p><strong>Uploaded:</strong> {formatDate(book.created_at)}</p>
        </div>
        <div className="book-highlights-panel">
          <h2>Highlights</h2>
          {loadingHighlights ? <p>Loading highlights...</p> : <HighlightList highlights={highlights} />}
        </div>
        <div className="book-actions-panel">
          <h2>Actions</h2>
          <button className="delete-button" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete Book'}
          </button>
          <p className="delete-warning">
            Warning: This action will permanently remove the book file from the server and cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
