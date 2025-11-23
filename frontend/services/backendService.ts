import { BookContentResponse, AskResponse, SummarizeResponse, GenerateQuizResponse, EvaluateQuizResponse, Book } from '../types';

const BASE_URL = 'https://6ga7cukouj.execute-api.eu-west-1.amazonaws.com/prod';

export const getBookContent = async (bookId: string, chapter: number = 1): Promise<BookContentResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/content/${bookId}?chapter=${chapter}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching book content:', error);
    throw error;
  }
};

export const askQuestion = async (bookId: string, chapterNumber: number, question: string): Promise<AskResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookId, chapterNumber, question }),
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
    const response = await fetch(`${BASE_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`${BASE_URL}/quiz/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`${BASE_URL}/quiz/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`${BASE_URL}/books`);
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
