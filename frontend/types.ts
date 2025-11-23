export interface BookRecommendation {
  title: string;
  author: string;
  description: string;
  rating: number;
  id?: string;
}

export interface BookDetails extends BookRecommendation {
  longDescription: string;
  chapters: string[];
  id?: string;
}

export enum SearchStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface Paragraph {
  chapter: string;
  section: string;
  paragraphText: string;
  metadata: any;
}

export interface BookContentResponse {
  bookId: string;
  items: Paragraph[];
}

export interface AskResponse {
  answer: string;
  userId: string;
  bookId: string;
}

export interface SummarizeResponse {
  summary: string;
  bookId: string;
  chapter: string;
}

export interface Book {
  bookId?: string; // PK in dynamo is book#<id>, we might need to parse it or use PK
  PK?: string;
  title?: string;
  author?: string;
  description?: string;
  fileName?: string;
  uploadedAt: number;
  chapters?: string[];
  chapterCount?: number;
}

export interface BookListResponse {
  books: Book[];
}