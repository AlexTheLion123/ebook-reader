/**
 * Spaced Repetition System (SRS) Constants
 * 
 * Combines Leitner box system with SM-2 algorithm for optimal retention.
 * Used by Anki, Duolingo, and other proven learning systems.
 */

// Leitner box intervals (days until next review for each box level)
export const BOX_INTERVALS = [1, 3, 7, 14, 30, 90, 180]; // Days for box 0-6

// SM-2 Ease Factor settings
export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;

// Maximum new cards per session by test mode
export const MAX_NEW_CARDS: Record<string, number> = {
  Quick: 0,        // No new cards, review only (catch-up mode)
  Standard: 12,    // Balanced learning
  Thorough: 40     // Aggressive learning
};

// Cap total cards per session to prevent burnout
export const MAX_REVIEW_CARDS_PER_SESSION = 80;

// Rating impact on ease factor (SM-2 algorithm adjustments)
export const EASE_ADJUSTMENTS: Record<string, number> = {
  Again: -0.20,    // Forgot - significant penalty
  Hard: -0.10,     // Struggled - small penalty
  Good: 0,         // Normal recall - no change
  Easy: +0.15      // Effortless - bonus
};

// Interval multipliers for each rating
export const INTERVAL_MULTIPLIERS: Record<string, number> = {
  Again: 0,        // Reset to 1 day
  Hard: 1.0,       // Same interval × ease
  Good: 1.0,       // Same interval × ease
  Easy: 1.5        // Bonus multiplier × ease
};

// Box change for each rating
export const BOX_CHANGES: Record<string, number> = {
  Again: -999,     // Reset to box 0 (handled specially in algorithm)
  Hard: -1,        // Move back one box
  Good: +1,        // Move forward one box
  Easy: +2         // Move forward two boxes
};

// Thorough mode: re-show cards answered wrong within this window
export const OVERLEARNING_WINDOW_HOURS = 6;

// Default values for new SRS progress items
export const DEFAULT_SRS_PROGRESS = {
  box: 0,
  ease: INITIAL_EASE,
  intervalDays: BOX_INTERVALS[0], // 1 day
  consecutiveCorrect: 0,
  totalReps: 0,
  previousFormats: [] as string[]
};
