import { BookContentResponse, AskResponse, SummarizeResponse, Book } from '../types';

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

export const askQuestion = async (userId: string, bookId: string, query: string): Promise<AskResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, bookId, query }),
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

export const summarizeChapter = async (userId: string, bookId: string, chapter?: string): Promise<SummarizeResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, bookId, chapter }),
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
