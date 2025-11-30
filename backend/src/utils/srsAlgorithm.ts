/**
 * Spaced Repetition System (SRS) Algorithm
 * 
 * Implements SM-2 algorithm combined with Leitner box system.
 * Based on proven spaced repetition research used by Anki, SuperMemo, etc.
 */

import {
  BOX_INTERVALS,
  MIN_EASE,
  MAX_EASE,
  INITIAL_EASE,
  DEFAULT_SRS_PROGRESS
} from './srsConstants';

export type SrsRating = 'Again' | 'Hard' | 'Good' | 'Easy';

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

/**
 * Add days to a date and return ISO date string (YYYY-MM-DD)
 */
export function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Create a new SRS progress item for a first-time question
 */
export function createNewSrsProgress(
  userId: string,
  bookId: string,
  questionId: string,
  chapterNumber: number
): SrsProgress {
  const today = new Date();
  
  return {
    PK: `user#${userId}`,
    SK: `srs#${bookId}#${questionId}`,
    box: DEFAULT_SRS_PROGRESS.box,
    ease: DEFAULT_SRS_PROGRESS.ease,
    intervalDays: DEFAULT_SRS_PROGRESS.intervalDays,
    dueDate: addDays(today, DEFAULT_SRS_PROGRESS.intervalDays),
    lastReviewed: today.toISOString(),
    consecutiveCorrect: DEFAULT_SRS_PROGRESS.consecutiveCorrect,
    totalReps: DEFAULT_SRS_PROGRESS.totalReps,
    previousFormats: [...DEFAULT_SRS_PROGRESS.previousFormats],
    chapterNumber
  };
}

/**
 * Update SRS progress based on user rating
 * 
 * Algorithm:
 * - Again: Reset to box 0, reduce ease, 1-day interval
 * - Hard: Move back 1 box, reduce ease slightly, interval × ease
 * - Good: Move forward 1 box, keep ease, interval × ease
 * - Easy: Move forward 2 boxes, increase ease, interval × ease × 1.5
 */
export function updateSrsProgress(
  current: SrsProgress,
  rating: SrsRating,
  newFormat?: string
): SrsProgress {
  let { box, ease, intervalDays } = current;
  const today = new Date();

  switch (rating) {
    case 'Again':
      // Forgot completely - reset to beginning
      box = 0;
      ease = Math.max(MIN_EASE, ease - 0.20);
      intervalDays = BOX_INTERVALS[0]; // 1 day
      break;

    case 'Hard':
      // Struggled - small setback
      ease = Math.max(MIN_EASE, ease - 0.10);
      intervalDays = Math.max(1, Math.round(intervalDays * ease));
      box = Math.max(0, box - 1);
      break;

    case 'Good':
      // Normal recall - progress forward
      intervalDays = Math.max(1, Math.round(intervalDays * ease));
      box = Math.min(6, box + 1);
      break;

    case 'Easy':
      // Effortless - accelerate progress
      ease = Math.min(MAX_EASE, ease + 0.15);
      intervalDays = Math.max(1, Math.round(intervalDays * ease * 1.5));
      box = Math.min(6, box + 2);
      break;
  }

  // Ensure interval doesn't exceed box maximum
  const maxIntervalForBox = BOX_INTERVALS[box] || BOX_INTERVALS[6];
  intervalDays = Math.min(intervalDays, maxIntervalForBox * 2);

  // Update previous formats if a new format was shown
  const previousFormats = current.previousFormats ? [...current.previousFormats] : [];
  if (newFormat && !previousFormats.includes(newFormat)) {
    previousFormats.push(newFormat);
  }

  return {
    ...current,
    box,
    ease: Math.round(ease * 100) / 100, // Round to 2 decimal places
    intervalDays,
    dueDate: addDays(today, intervalDays),
    lastReviewed: today.toISOString(),
    totalReps: current.totalReps + 1,
    consecutiveCorrect: rating === 'Again' ? 0 : current.consecutiveCorrect + 1,
    previousFormats
  };
}

/**
 * Check if a card is due for review
 */
export function isDue(srsProgress: SrsProgress): boolean {
  const today = getTodayDate();
  return srsProgress.dueDate <= today;
}

/**
 * Calculate the next interval preview for each rating option
 * Used to show "Again (1d) | Hard (~3d) | Good (~7d) | Easy (~14d)" in UI
 */
export function previewIntervals(current: SrsProgress): Record<SrsRating, number> {
  const { ease, intervalDays, box } = current;
  
  return {
    Again: 1,
    Hard: Math.max(1, Math.round(intervalDays * ease)),
    Good: Math.max(1, Math.round(intervalDays * ease)),
    Easy: Math.max(1, Math.round(intervalDays * ease * 1.5))
  };
}

/**
 * Extract bookId and questionId from SK
 * SK format: srs#{bookId}#{questionId}
 */
export function parseSrsSK(sk: string): { bookId: string; questionId: string } | null {
  const parts = sk.split('#');
  if (parts.length >= 3 && parts[0] === 'srs') {
    return {
      bookId: parts[1],
      questionId: parts.slice(2).join('#') // questionId might contain #
    };
  }
  return null;
}

/**
 * Extract chapter number from question ID
 * Question ID format: q-ch{N}-{XXX} (e.g., q-ch1-001)
 */
export function extractChapterFromQuestionId(questionId: string): number {
  const match = questionId.match(/q-ch(\d+)-/);
  return match ? parseInt(match[1], 10) : 0;
}
