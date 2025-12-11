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
  sourceFormat?: 'epub' | 'html' | 'tex'; // Rendering hint - 'html' means render as-is in iframe
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
  sourceFormat?: 'epub' | 'html' | 'tex'; // Rendering hint - 'html' means render as-is in iframe
}

export interface BookListResponse {
  books: Book[];
}

export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'FILL_BLANK' | 'TRUE_FALSE' | 'BRIEF_RESPONSE';

// Hint structure for progressive hints
export interface QuestionHint {
  level: 'small' | 'medium' | 'big';
  text: string;
}

// Tags for filtering and categorization
export interface QuestionTags {
  difficulty: 'basic' | 'medium' | 'deep' | 'mastery';
  themes: string[];
  elements: string[];
  style?: string[];   // e.g., 'irony', 'satire', 'wit', 'narrator_voice', 'free_indirect_discourse'
  motifs?: string[];  // e.g., 'balls_dances', 'estates', 'letters', 'reading', 'journeys'
  literaryDevices?: string[]; // e.g., 'metaphor', 'simile', 'foreshadowing', 'allusion', 'parallelism', 'foils', 'symbolism'
}

// Full assessment question from pre-generated questions
export interface AssessmentQuestion {
  id: string;
  bookId: string;
  chapterNumber: number;
  type: QuestionType;
  text: string;
  options?: string[]; // For MCQ, TRUE_FALSE
  correctAnswer: string;
  acceptableAnswers?: string[]; // For SHORT_ANSWER, BRIEF_RESPONSE
  rubric?: string; // Grading criteria for open-ended questions
  hints: QuestionHint[];
  explanation: string;
  tags: QuestionTags;
}

// Legacy Question interface (for backward compatibility)
export interface Question {
  id: number | string;
  type: QuestionType;
  text: string;
  options?: string[]; // For MCQ
  correctAnswer: string; // For validation
  explanation: string;
  // Extended fields from AssessmentQuestion
  hints?: QuestionHint[];
  tags?: QuestionTags;
  acceptableAnswers?: string[];
  rubric?: string;
  chapterNumber?: number;
}

// Response from GET /questions/{bookId}
export interface GetQuestionsResponse {
  bookId: string;
  questions: AssessmentQuestion[];
  totalCount: number;
  filters: {
    chapters?: number[];
    difficulty?: string[];
    types?: string[];
    limit?: number;
  };
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
  bookId: string;
  bookTitle: string;
  overallMastery: number;
  chaptersMastered: number;
  totalChapters: number;
  lastTestedDate: string;
  weakAreas: string[];
  concepts: ConceptProgress[];
  chapterBreakdown: ChapterProgress[];
}

// ============================================
// SRS (Spaced Repetition System) Types
// ============================================

export type SrsRating = 'Again' | 'Hard' | 'Good' | 'Easy';
export type TestMode = 'Quick' | 'Standard' | 'Thorough';
export type Scope = 'full' | 'chapters' | 'concepts';

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

export interface AssessmentQuestionWithSrs extends AssessmentQuestion {
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
  questionFormat?: string;
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
  masteredCount: number;
  dueCount: number;
  newCount: number;
  status: 'mastered' | 'in-progress' | 'untouched';
  percentage: number;
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

// ============================================
// Test Session Configuration (for instant start)
// ============================================

/**
 * Configuration to start a test session with pre-filled options.
 * Used for instant start (one-tap) to skip the config modal.
 */
export interface TestSessionConfig {
  /** 'chapters' | 'concepts' | 'full' */
  scope: Scope;
  /** Array of 1-indexed chapter numbers (for scope='chapters') */
  chapters?: number[];
  /** Array of concept strings (for scope='concepts') */
  concepts?: string[];
  /** Difficulty levels to include */
  difficulty: ('basic' | 'medium' | 'deep' | 'mastery')[];
  /** Target number of questions (null = whatever is available for Quick mode) */
  length: number | null;
  /** Test mode - affects question selection */
  mode: TestMode;
}
