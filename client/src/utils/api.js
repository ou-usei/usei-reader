import useAuthStore from '../stores/authStore';

const API_BASE_URL = '/api'; // Using proxy

/**
 * A helper function to get authentication headers.
 * It retrieves the token from the auth store.
 * @returns {object} The headers object with Authorization token if available.
 */
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * A helper function to handle API responses.
 * @param {Response} response - The fetch response object.
 * @returns {Promise<any>} The response JSON data.
 * @throws {Error} If the response is not ok.
 */
const handleResponse = async (response) => {
  // Handle cases with no content, like a successful DELETE request
  if (response.status === 204) {
    return;
  }

  const data = await response.json();
  if (!response.ok) {
    const error = (data && data.error) || response.statusText;
    throw new Error(error);
  }
  return data;
};

/**
 * Registers a new user.
 * @param {object} credentials - The user's credentials.
 */
export const registerUser = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  return handleResponse(response);
};

/**
 * Logs in a user.
 * @param {object} credentials - The user's credentials.
 */
export const loginUser = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  return handleResponse(response);
};

/**
 * Fetches the list of books for the user.
 */
export const getBooks = async () => {
  const response = await fetch(`${API_BASE_URL}/books`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * Uploads a new book.
 * @param {FormData} formData - The form data containing the book file.
 */
export const uploadBook = async (formData) => {
  const token = useAuthStore.getState().token;
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Note: Don't set 'Content-Type' for FormData, the browser does it automatically.
  const response = await fetch(`${API_BASE_URL}/books/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handleResponse(response);
};

/**
 * Deletes a book by its UUID.
 * @param {string} uuid - The UUID of the book to delete.
 */
export const deleteBook = async (uuid) => {
  const response = await fetch(`${API_BASE_URL}/books/${uuid}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * Gets the reading progress for a specific book.
 * @param {string} bookId - The ID of the book.
 */
export const getProgress = async (bookId) => {
  const response = await fetch(`${API_BASE_URL}/progress/${bookId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * Saves the reading progress for a specific book.
 * @param {string} bookId - The ID of the book.
 * @param {object} progress - The progress data (e.g., { cfi: '...' }).
 */
export const saveProgress = async (bookId, progress) => {
  const response = await fetch(`${API_BASE_URL}/progress/${bookId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(progress),
  });
  return handleResponse(response);
};

/**
 * Gets all highlights for a specific book.
 * @param {string} bookId - The ID of the book.
 */
export const getHighlights = async (bookId) => {
  const response = await fetch(`${API_BASE_URL}/highlights/${bookId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * Adds a new highlight for a book.
 * @param {object} highlightData - The data for the new highlight.
 */
export const addHighlight = async (highlightData) => {
  const response = await fetch(`${API_BASE_URL}/highlights`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(highlightData),
  });
  return handleResponse(response);
};

/**
 * Deletes a highlight by its ID.
 * @param {number} highlightId - The ID of the highlight to delete.
 */
export const deleteHighlight = async (highlightId) => {
  const response = await fetch(`${API_BASE_URL}/highlights/${highlightId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};