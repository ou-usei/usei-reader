import { create } from 'zustand';
import * as api from '../utils/api';

const useReaderStore = create((set) => ({
  progress: null,
  highlights: [],
  isLoading: false,
  error: null,

  // Fetch initial data for a book
  fetchBookData: async (bookId) => {
    set({ isLoading: true, error: null });
    try {
      const [progress, highlights] = await Promise.all([
        api.getProgress(bookId),
        api.getHighlights(bookId)
      ]);
      set({ progress, highlights, isLoading: false });
      return { progress, highlights };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { error };
    }
  },

  // Save reading progress
  saveProgress: async (bookId, progressData) => {
    set({ isLoading: true });
    try {
      const updatedProgress = await api.saveProgress(bookId, progressData);
      set((state) => ({
        progress: updatedProgress,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Add a new highlight
  addHighlight: async (highlightData) => {
    try {
      const newHighlight = await api.addHighlight(highlightData);
      set((state) => ({
        highlights: [...state.highlights, newHighlight],
      }));
    } catch (error) {
      // Handle error in the component for better UX
      console.error("Failed to add highlight:", error);
      throw error;
    }
  },

  // Delete a highlight
  deleteHighlight: async (highlightId) => {
    try {
      await api.deleteHighlight(highlightId);
      set((state) => ({
        highlights: state.highlights.filter((h) => h.id !== highlightId),
      }));
    } catch (error) {
      console.error("Failed to delete highlight:", error);
      throw error;
    }
  },
  
  // Clear data when leaving the reader
  clearReaderState: () => {
    set({ progress: null, highlights: [], error: null });
  }
}));

export default useReaderStore;
