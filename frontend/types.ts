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
  concepts?: string[]; // Optional array of testable concepts (themes, motifs, symbols, etc.)
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
  content?: string; // HTML content from S3 for EPUB chapters
  s3Key?: string;
}

export interface BookContentResponse {
  bookId: string;
  items: Paragraph[];
}

export interface AskResponse {
  answer: string;
  bookId: string;
  chapterNumber: number;
}

export interface SummarizeResponse {
  summary: string;
  bookId: string;
  chapterNumber: number;
  cached: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface GenerateQuizResponse {
  questions: QuizQuestion[];
  bookId: string;
  chapterNumber: number;
  cached: boolean;
}

export interface EvaluateQuizResponse {
  isCorrect: boolean;
  score: number;
  feedback: string;
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
  concepts?: string[];
}

export interface BookListResponse {
  books: Book[];
}

export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'FILL_BLANK' | 'TRUE_FALSE';

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  options?: string[]; // For MCQ
  correctAnswer: string; // For validation
  explanation: string;
}

// Dashboard progress types
export interface ConceptProgress {
  name: string;
  score: number; // 0-100
}

export interface ChapterProgress {
  chapterIndex: number;
  status: 'LOCKED' | 'UNTOUCHED' | 'IN_PROGRESS' | 'MASTERED';
  score: number;
}

export interface BookProgress {
  bookTitle: string;
  overallMastery: number;
  chaptersMastered: number;
  totalChapters: number;
  lastTestedDate: string;
  weakAreas: string[];
  concepts: ConceptProgress[];
  chapterBreakdown: ChapterProgress[];
}