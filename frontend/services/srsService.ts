/**
 * SRS (Spaced Repetition System) Service
 * 
 * Handles communication with the SRS backend endpoints for:
 * - Fetching question batches based on SRS algorithm
 * - Submitting answers with self-ratings
 * - Fetching chapter mastery statistics
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import {
  SrsGetBatchRequest,
  SrsGetBatchResponse,
  SrsSubmitRequest,
  SrsSubmitResponse,
  ChapterStatsResponse,
  SrsRating,
  TestMode,
  Scope
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://6ga7cukouj.execute-api.eu-west-1.amazonaws.com/prod';

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
 * Fetch a batch of questions for SRS review
 * 
 * @param params - Request parameters including bookId, mode, filters
 * @returns Batch of questions with SRS metadata
 */
export const fetchSrsBatch = async (params: SrsGetBatchRequest): Promise<SrsGetBatchResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/srs/next-batch`, {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch SRS batch: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching SRS batch:', error);
    throw error;
  }
};

/**
 * Submit an answer with SRS self-rating
 * 
 * @param params - Request parameters including questionId, rating
 * @returns Updated SRS progress for the question
 */
export const submitSrsAnswer = async (params: SrsSubmitRequest): Promise<SrsSubmitResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/srs/submit-answer`, {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to submit SRS answer: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting SRS answer:', error);
    throw error;
  }
};

/**
 * Fetch chapter mastery statistics for the chapter map visualization
 * 
 * @param bookId - The book ID to get stats for
 * @returns Chapter-by-chapter mastery statistics
 */
export const fetchChapterStats = async (bookId: string): Promise<ChapterStatsResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/srs/chapter-stats/${bookId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch chapter stats: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching chapter stats:', error);
    throw error;
  }
};

/**
 * Helper to convert frontend test mode to API format
 */
export const mapTestModeToApi = (mode: 'QUICK' | 'STANDARD' | 'THOROUGH'): TestMode => {
  const modeMap: Record<string, TestMode> = {
    'QUICK': 'Quick',
    'STANDARD': 'Standard',
    'THOROUGH': 'Thorough'
  };
  return modeMap[mode] || 'Standard';
};

/**
 * Helper to convert frontend scope to API format
 */
export const mapScopeToApi = (scope: 'FULL' | 'CHAPTER' | 'CONCEPTS'): Scope => {
  const scopeMap: Record<string, Scope> = {
    'FULL': 'full',
    'CHAPTER': 'chapters',
    'CONCEPTS': 'concepts'
  };
  return scopeMap[scope] || 'full';
};

/**
 * Helper to get interval preview text for rating buttons
 * Returns strings like "1d", "3d", "7d", "14d"
 */
export const getIntervalText = (days: number): string => {
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
};

/**
 * Rating button configuration
 */
export const RATING_CONFIG: Record<SrsRating, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  hoverColor: string;
}> = {
  Again: {
    label: 'Again',
    description: 'Forgot',
    color: '#ef4444', // red-500
    bgColor: 'bg-red-500/20',
    hoverColor: 'hover:bg-red-500/30',
  },
  Hard: {
    label: 'Hard',
    description: 'Difficult',
    color: '#f97316', // orange-500
    bgColor: 'bg-orange-500/20',
    hoverColor: 'hover:bg-orange-500/30',
  },
  Good: {
    label: 'Good',
    description: 'Got it',
    color: '#22c55e', // green-500
    bgColor: 'bg-green-500/20',
    hoverColor: 'hover:bg-green-500/30',
  },
  Easy: {
    label: 'Easy',
    description: 'Too easy!',
    color: '#3b82f6', // blue-500
    bgColor: 'bg-blue-500/20',
    hoverColor: 'hover:bg-blue-500/30',
  },
};
