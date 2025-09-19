import { create } from 'zustand';
import * as api from '../utils/api';

const useBookStore = create((set, get) => ({
  books: [],
  isLoading: false,
  error: null,
  uploadMessage: '',

  fetchBooks: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.getBooks();
      // Ensure we always have an array.
      const booksArray = Array.isArray(result) ? result : [];
      set({ books: booksArray, isLoading: false });
    } catch (error) {
      // Also reset books to an empty array on error to prevent render issues.
      set({ error: error.message, isLoading: false, books: [] });
    }
  },

  uploadBook: async (formData) => {
    set({ isLoading: true, uploadMessage: 'Uploading...' });
    try {
      await api.uploadBook(formData);
      set({ uploadMessage: '✅ Upload successful!' });
      await get().fetchBooks(); // Refresh the book list
    } catch (error) {
      set({ uploadMessage: `❌ Upload failed: ${error.message}` });
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteBook: async (uuid) => {
    set({ isLoading: true });
    try {
      await api.deleteBook(uuid);
      await get().fetchBooks(); // Refresh the book list
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useBookStore;
