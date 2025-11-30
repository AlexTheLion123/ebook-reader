import { BookContentResponse, AskResponse, SummarizeResponse, GenerateQuizResponse, EvaluateQuizResponse, Book, GetQuestionsResponse, QuestionType } from '../types';
import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://6ga7cukouj.execute-api.eu-west-1.amazonaws.com/prod';

/**
 * Get authorization headers for authenticated API requests
 * Returns empty object if user is not authenticated
 */
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (error) {
    // User not authenticated, return empty headers
    console.debug('User not authenticated, making unauthenticated request');
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

export const getBookContent = async (bookId: string, chapter: number = 1): Promise<BookContentResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/content/${bookId}?chapter=${chapter}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching book content:', error);
    throw error;
  }
};

export const askQuestion = async (bookId: string, chapterNumber: number, question: string, quizMode?: boolean): Promise<AskResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/ask`, {
      method: 'POST',
      body: JSON.stringify({ bookId, chapterNumber, question, quizMode }),
    });

    if (!response.ok) {
      throw new Error(`Failed to ask question: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error asking question:', error);
    throw error;
  }
};

export const summarizeChapter = async (bookId: string, chapterNumber: number): Promise<SummarizeResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/summarize`, {
      method: 'POST',
      body: JSON.stringify({ bookId, chapterNumber }),
    });

    if (!response.ok) {
      throw new Error(`Failed to summarize chapter: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error summarizing chapter:', error);
    throw error;
  }
};

export const generateQuiz = async (bookId: string, chapterNumber: number, questionCount?: number): Promise<GenerateQuizResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/quiz/generate`, {
      method: 'POST',
      body: JSON.stringify({ bookId, chapterNumber, questionCount }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate quiz: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw error;
  }
};

export const evaluateQuiz = async (question: string, userAnswer: string, correctAnswer: string, type: 'multiple-choice' | 'short-answer'): Promise<EvaluateQuizResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/quiz/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ question, userAnswer, correctAnswer, type }),
    });

    if (!response.ok) {
      throw new Error(`Failed to evaluate quiz: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error evaluating quiz:', error);
    throw error;
  }
};

export const listBooks = async (): Promise<Book[]> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/books`);
    if (!response.ok) {
      throw new Error(`Failed to list books: ${response.statusText}`);
    }
    const data = await response.json();
    // The backend returns { books: [...] }
    return data.books || [];
  } catch (error) {
    console.error('Error listing books:', error);
    throw error;
  }
};

export interface FetchQuestionsParams {
  bookId: string;
  chapters?: number[];
  difficulty?: ('basic' | 'medium' | 'deep' | 'mastery')[];
  types?: QuestionType[];
  limit?: number;
  shuffle?: boolean;
}

export const fetchQuestions = async (params: FetchQuestionsParams): Promise<GetQuestionsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.chapters && params.chapters.length > 0) {
      queryParams.set('chapters', params.chapters.join(','));
    }
    if (params.difficulty && params.difficulty.length > 0) {
      queryParams.set('difficulty', params.difficulty.join(','));
    }
    if (params.types && params.types.length > 0) {
      queryParams.set('types', params.types.join(','));
    }
    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }
    if (params.shuffle !== undefined) {
      queryParams.set('shuffle', params.shuffle.toString());
    }
    
    const queryString = queryParams.toString();
    const url = `${BASE_URL}/questions/${params.bookId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch questions: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

export interface EvaluateAnswerParams {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  type: QuestionType;
  acceptableAnswers?: string[];
  rubric?: string;
}

export const evaluateAnswer = async (params: EvaluateAnswerParams): Promise<EvaluateQuizResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/quiz/evaluate`, {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to evaluate answer: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error evaluating answer:', error);
    throw error;
  }
};

export interface HintResponse {
  hint: string;
  hintLevel: number;
  bookId: string;
  chapterNumber: number;
}

export const getHint = async (
  bookId: string, 
  question: string, 
  hintLevel: 1 | 2 | 3,
  chapterNumber?: number,
  questionType?: QuestionType
): Promise<HintResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/hint`, {
      method: 'POST',
      body: JSON.stringify({ bookId, question, hintLevel, chapterNumber, questionType }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get hint: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting hint:', error);
    throw error;
  }
};

/**
 * Question metadata response - which chapters have questions
 */
export interface QuestionMetadataResponse {
  bookId: string;
  availableChapters: number[];
  totalQuestions: number;
  questionsByChapter: Record<number, number>;
}

/**
 * Fetch metadata about which chapters have questions available
 */
export const fetchQuestionMetadata = async (bookId: string): Promise<QuestionMetadataResponse> => {
  try {
    const response = await authenticatedFetch(`${BASE_URL}/questions/${bookId}?metadata=true`);

    if (!response.ok) {
      throw new Error(`Failed to fetch question metadata: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching question metadata:', error);
    throw error;
  }
};

/**
 * Get the current authenticated user's ID
 * Returns null if not authenticated
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.payload?.sub as string || null;
  } catch (error) {
    return null;
  }
};
