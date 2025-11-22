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
  userId: string;
  bookId: string;
  query: string;
  sessionId?: string;
}

export interface SummarizeRequest {
  userId: string;
  bookId: string;
  chapter?: number;
}
