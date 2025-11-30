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

// ============================================
// SRS (Spaced Repetition System) Types
// ============================================

export type SrsRating = 'Again' | 'Hard' | 'Good' | 'Easy';
export type TestMode = 'Quick' | 'Standard' | 'Thorough';
export type Scope = 'full' | 'chapters' | 'concepts';

export interface SrsProgress {
  PK: string;                    // user#{userId}
  SK: string;                    // srs#{bookId}#{questionId}
  box: number;                   // 0-6 (Leitner box)
  ease: number;                  // 1.3-3.0 (SM-2 ease factor)
  intervalDays: number;          // Days until next review
  dueDate: string;               // ISO date string (YYYY-MM-DD)
  lastReviewed: string;          // ISO timestamp
  consecutiveCorrect: number;    // Streak tracking
  totalReps: number;             // Total times reviewed
  previousFormats?: string[];    // Formats shown for rephrasing
  chapterNumber: number;         // Denormalized for chapter stats
}

export interface SrsGetBatchRequest {
  bookId: string;
  mode: TestMode;
  scope: Scope;
  chapters?: number[];
  concepts?: string[];
  difficulty?: ('basic' | 'medium' | 'deep' | 'mastery')[];
}

export interface SrsGetBatchResponse {
  questions: AssessmentQuestionWithSrs[];
  metadata: {
    totalDueToday: number;
    newToday: number;
    reviewToday: number;
    streak: number;
  };
  message?: string;
}

export interface AssessmentQuestionWithSrs {
  id: string;
  bookId: string;
  chapterNumber: number;
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_BLANK' | 'BRIEF_RESPONSE';
  text: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  rubric?: string;
  hints: Array<{ level: string; text: string }>;
  explanation: string;
  tags: {
    difficulty: 'basic' | 'medium' | 'deep' | 'mastery';
    themes: string[];
    elements: string[];
    style?: string[];
    motifs?: string[];
    literaryDevices?: string[];
  };
  srsData?: {
    box: number;
    dueDate: string;
    isNew: boolean;
    intervalDays: number;
  };
}

export interface SrsSubmitRequest {
  bookId: string;
  questionId: string;
  userAnswer: string;
  rating: SrsRating;
  questionFormat?: string;  // Track which format was shown
}

export interface SrsSubmitResponse {
  success: boolean;
  isCorrect: boolean;
  newBox: number;
  newDueDate: string;
  intervalDays: number;
  streak: number;
  totalReps: number;
}

export interface ChapterMasteryStats {
  chapterNumber: number;
  totalQuestions: number;
  seenCount: number;
  masteredCount: number;  // Box 5 or 6
  dueCount: number;
  newCount: number;
  status: 'mastered' | 'in-progress' | 'untouched';
  percentage: number;     // 0-100
}

export interface ChapterStatsResponse {
  bookId: string;
  chapters: ChapterMasteryStats[];
  overall: {
    totalQuestions: number;
    masteredCount: number;
    percentage: number;
    streak: number;
  };
}
