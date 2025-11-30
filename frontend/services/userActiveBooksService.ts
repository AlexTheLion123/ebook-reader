/**
 * User Active Books Service
 * 
 * Manages the list of books a user has actively started learning.
 * Uses backend API for cross-device sync with localStorage fallback.
 */

import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://6ga7cukouj.execute-api.eu-west-1.amazonaws.com/prod';
const STORAGE_KEY_PREFIX = 'quickbook_active_books_';

export interface ActiveBook {
  bookId: string;
  bookTitle: string;
  addedAt: string; // ISO date string
}

/**
 * Get authorization headers for authenticated API requests
 */
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (error) {
    console.debug('User not authenticated');
  }
  return {};
};

/**
 * Helper to make authenticated fetch requests
 */
const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const authHeaders = await getAuthHeaders();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });
};

/**
 * Check if user is authenticated
 */
const isUserAuthenticated = async (): Promise<boolean> => {
  try {
    const session = await fetchAuthSession();
    return !!session.tokens?.idToken;
  } catch {
    return false;
  }
};

/**
 * Get the current user's ID for localStorage fallback key
 */
const getUserStorageKey = async (): Promise<string> => {
  try {
    const session = await fetchAuthSession();
    const userId = session.tokens?.idToken?.payload?.sub as string;
    if (userId) {
      return `${STORAGE_KEY_PREFIX}${userId}`;
    }
  } catch (error) {
    console.debug('User not authenticated, using anonymous storage');
  }
  return `${STORAGE_KEY_PREFIX}anonymous`;
};

// ============================================
// localStorage Fallback Functions
// ============================================

const getLocalActiveBooks = async (): Promise<ActiveBook[]> => {
  try {
    const storageKey = await getUserStorageKey();
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored) as ActiveBook[];
    }
  } catch (error) {
    console.error('Error reading active books from localStorage:', error);
  }
  return [];
};

const addLocalActiveBook = async (bookId: string, bookTitle: string): Promise<boolean> => {
  try {
    const storageKey = await getUserStorageKey();
    const activeBooks = await getLocalActiveBooks();
    
    if (activeBooks.some((book) => book.bookId === bookId)) {
      return false;
    }
    
    const newBook: ActiveBook = {
      bookId,
      bookTitle,
      addedAt: new Date().toISOString(),
    };
    
    const updated = [...activeBooks, newBook];
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Error adding active book to localStorage:', error);
    throw error;
  }
};

const removeLocalActiveBook = async (bookId: string): Promise<boolean> => {
  try {
    const storageKey = await getUserStorageKey();
    const activeBooks = await getLocalActiveBooks();
    
    const index = activeBooks.findIndex((book) => book.bookId === bookId);
    if (index === -1) {
      return false;
    }
    
    const updated = activeBooks.filter((book) => book.bookId !== bookId);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Error removing active book from localStorage:', error);
    throw error;
  }
};

const isLocalBookActive = async (bookId: string): Promise<boolean> => {
  const activeBooks = await getLocalActiveBooks();
  return activeBooks.some((book) => book.bookId === bookId);
};

// ============================================
// Main API Functions (with localStorage fallback)
// ============================================

/**
 * Get the list of active books for the current user
 */
export const getUserActiveBooks = async (): Promise<ActiveBook[]> => {
  const isAuth = await isUserAuthenticated();
  
  if (!isAuth) {
    return getLocalActiveBooks();
  }

  try {
    const response = await authenticatedFetch(`${BASE_URL}/user/active-books`);
    
    if (!response.ok) {
      console.warn('Failed to fetch active books from API, falling back to localStorage');
      return getLocalActiveBooks();
    }
    
    const data = await response.json();
    return data.activeBooks || [];
  } catch (error) {
    console.error('Error fetching active books:', error);
    return getLocalActiveBooks();
  }
};

/**
 * Check if a specific book is in the user's active books list
 */
export const isBookActive = async (bookId: string): Promise<boolean> => {
  const isAuth = await isUserAuthenticated();
  
  if (!isAuth) {
    return isLocalBookActive(bookId);
  }

  try {
    const activeBooks = await getUserActiveBooks();
    return activeBooks.some((book) => book.bookId === bookId);
  } catch (error) {
    console.error('Error checking if book is active:', error);
    return isLocalBookActive(bookId);
  }
};

/**
 * Add a book to the user's active books list
 * 
 * @returns true if added, false if already exists
 */
export const addActiveBook = async (bookId: string, bookTitle: string): Promise<boolean> => {
  const isAuth = await isUserAuthenticated();
  
  if (!isAuth) {
    return addLocalActiveBook(bookId, bookTitle);
  }

  try {
    const response = await authenticatedFetch(`${BASE_URL}/user/active-books`, {
      method: 'POST',
      body: JSON.stringify({ bookId, bookTitle }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add active book: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Also update localStorage for offline access
    await addLocalActiveBook(bookId, bookTitle);
    
    return !data.alreadyExists;
  } catch (error) {
    console.error('Error adding active book:', error);
    throw new Error('Failed to add book to active courses');
  }
};

/**
 * Remove a book from the user's active books list
 * 
 * @returns true if removed, false if not found
 */
export const removeActiveBook = async (bookId: string): Promise<boolean> => {
  const isAuth = await isUserAuthenticated();
  
  if (!isAuth) {
    return removeLocalActiveBook(bookId);
  }

  try {
    const response = await authenticatedFetch(`${BASE_URL}/user/active-books/${bookId}`, {
      method: 'DELETE',
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw new Error(`Failed to remove active book: ${response.statusText}`);
    }

    // Also update localStorage
    await removeLocalActiveBook(bookId);
    
    return true;
  } catch (error) {
    console.error('Error removing active book:', error);
    throw new Error('Failed to remove book from active courses');
  }
};

/**
 * Clear all active books for the current user (localStorage only for now)
 */
export const clearActiveBooks = async (): Promise<void> => {
  try {
    const storageKey = await getUserStorageKey();
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error clearing active books:', error);
  }
};
