import { create } from 'zustand';

const useViewStore = create((set) => ({
  view: 'dashboard', // 'dashboard', 'reader', 'details', 'settings'
  selectedBook: null,
  
  setView: (view) => set({ view }),
  setSelectedBook: (book) => set({ selectedBook: book }),
}));

export default useViewStore;
