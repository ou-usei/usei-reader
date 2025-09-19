import { create } from 'zustand';
import * as api from '../utils/api';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: true, // To track initial auth status check

  /**
   * Initializes the auth state from localStorage.
   */
  initialize: () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        // For simplicity, we'll decode the user from the token.
        // In a real app, you might want to verify the token with the backend.
        const userPayload = JSON.parse(atob(token.split('.')[1]));
        const user = { id: userPayload.id, email: userPayload.email };
        set({ user, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Failed to initialize auth state:", error);
      localStorage.removeItem('jwt_token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  /**
   * Logs in the user and stores the token.
   * @param {object} credentials - email and password.
   */
  login: async (credentials) => {
    const response = await api.loginUser(credentials);
    if (response.success && response.token) {
      localStorage.setItem('jwt_token', response.token);
      set({ user: response.user, token: response.token });
    }
  },

  /**
   * Logs out the user and clears the token.
   */
  logout: () => {
    localStorage.removeItem('jwt_token');
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
