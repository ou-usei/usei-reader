import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from './Dashboard';
import useBookStore from '../stores/bookStore';
import useAuthStore from '../stores/authStore';

// Mock the stores
jest.mock('../stores/bookStore');
jest.mock('../stores/authStore');

describe('Dashboard Component', () => {
  const mockFetchBooks = jest.fn();
  const mockUploadBook = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    mockFetchBooks.mockClear();
    mockUploadBook.mockClear();

    // Provide mock implementation for the stores
    useAuthStore.mockReturnValue({ user: { email: 'test@example.com' } });
    useBookStore.mockReturnValue({
      books: [],
      isLoading: false,
      error: null,
      uploadMessage: '',
      fetchBooks: mockFetchBooks,
      uploadBook: mockUploadBook,
    });
  });

  test('renders dashboard title and welcome message', () => {
    render(<Dashboard onReadBook={() => {}} onShowDetails={() => {}} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
  });

  test('calls fetchBooks on component mount', () => {
    render(<Dashboard onReadBook={() => {}} onShowDetails={() => {}} />);
    
    expect(mockFetchBooks).toHaveBeenCalledTimes(1);
  });

  test('displays loading message when loading', () => {
    useBookStore.mockReturnValue({
      ...useBookStore(),
      isLoading: true,
    });

    render(<Dashboard onReadBook={() => {}} onShowDetails={() => {}} />);
    
    expect(screen.getByText('Loading books...')).toBeInTheDocument();
  });

  test('displays error message on error', () => {
    const errorMessage = 'Failed to fetch books';
    useBookStore.mockReturnValue({
      ...useBookStore(),
      error: errorMessage,
    });

    render(<Dashboard onReadBook={() => {}} onShowDetails={() => {}} />);
    
    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });

  test('displays "No books uploaded yet" message when there are no books', () => {
    render(<Dashboard onReadBook={() => {}} onShowDetails={() => {}} />);
    
    expect(screen.getByText('No books uploaded yet.')).toBeInTheDocument();
  });

  test('displays a list of books when books are available', () => {
    const mockBooks = [
      { uuid: '1', title: 'Book 1', author: 'Author 1', original_filename: 'book1.epub', created_at: new Date().toISOString() },
      { uuid: '2', title: 'Book 2', author: 'Author 2', original_filename: 'book2.epub', created_at: new Date().toISOString() },
    ];
    useBookStore.mockReturnValue({
      ...useBookStore(),
      books: mockBooks,
    });

    render(<Dashboard onReadBook={() => {}} onShowDetails={() => {}} />);
    
    expect(screen.getByText('Book 1')).toBeInTheDocument();
    expect(screen.getByText('Book 2')).toBeInTheDocument();
    expect(screen.queryByText('No books uploaded yet.')).not.toBeInTheDocument();
  });
});
