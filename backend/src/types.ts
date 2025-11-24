export interface TextbookContent {
  PK: string; // book#{bookId}
  SK: string; // chapter#{chapterNumber}#para#{paraIndex}
  chapter: number;
  section: string;
  paragraphText: string;
  metadata?: {
    pageNumber?: number;
    heading?: string;
  };
}

export interface UserProgress {
  PK: string; // user#{userId}
  SK: string; // book#{bookId}#session#{sessionId}
  answers?: Array<{
    questionId: string;
    userAnswer: string;
    score: number;
    timestamp: number;
  }>;
  lastSeen: number;
}

export interface AskRequest {
  bookId: string;
  chapterNumber?: number;
  question: string;
}

export interface SummarizeRequest {
  bookId: string;
  chapterNumber: number;
}

export interface HintRequest {
  bookId: string;
  chapterNumber?: number;
  question: string;
  hintLevel: 1 | 2 | 3;
  questionType?: 'MCQ' | 'SHORT_ANSWER' | 'FILL_BLANK' | 'TRUE_FALSE';
}
