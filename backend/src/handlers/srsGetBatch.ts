/**
 * SRS Get Batch Handler
 * 
 * POST /srs/next-batch
 * 
 * Returns a batch of questions for review based on:
 * - Due reviews (cards with dueDate <= today)
 * - New cards (based on mode: Quick=0, Standard=12, Thorough=40)
 * - User filters (chapters, concepts, difficulty)
 */

import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryItems, getItem } from '../utils/dynamodb';
import { getTodayDate, extractChapterFromQuestionId } from '../utils/srsAlgorithm';
import { MAX_NEW_CARDS, MAX_REVIEW_CARDS_PER_SESSION } from '../utils/srsConstants';
import { 
  SrsGetBatchRequest, 
  SrsGetBatchResponse, 
  SrsProgress,
  AssessmentQuestionWithSrs,
  TestMode
} from '../types';

const CONTENT_TABLE = process.env.CONTENT_TABLE!;
const PROGRESS_TABLE = process.env.PROGRESS_TABLE!;

interface StoredQuestion {
  id: string;
  bookId?: string;
  chapterNumber?: number;
  type: string;
  text: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  rubric?: string;
  hints: Array<{ level: string; text: string }>;
  explanation: string;
  tags: {
    difficulty: string;
    themes: string[];
    elements: string[];
    style?: string[];
    motifs?: string[];
    literaryDevices?: string[];
  };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  try {
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - no user ID' }),
      };
    }

    // Parse request body
    const body: SrsGetBatchRequest = JSON.parse(event.body || '{}');
    const { bookId, mode = 'Standard', scope = 'full', chapters, concepts, difficulty } = body;

    if (!bookId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'bookId is required' }),
      };
    }

    const today = getTodayDate();
    const pk = `book#${bookId}`;
    const userPk = `user#${userId}`;

    // 1. Fetch all questions for this book
    const questionItems = await queryItems(CONTENT_TABLE, pk, 'questions#');
    let allQuestions: StoredQuestion[] = [];
    
    for (const item of questionItems) {
      if (item.questions && Array.isArray(item.questions)) {
        // Add bookId and chapterNumber to each question
        const chapterNum = parseInt(item.SK.split('#')[1], 10);
        const questionsWithMeta = item.questions.map((q: StoredQuestion) => ({
          ...q,
          bookId,
          chapterNumber: chapterNum
        }));
        allQuestions.push(...questionsWithMeta);
      }
    }

    // 2. Apply filters
    let filteredQuestions = allQuestions;

    // Filter by chapters
    if (scope === 'chapters' && chapters && chapters.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.chapterNumber && chapters.includes(q.chapterNumber)
      );
    }

    // Filter by concepts (map to tags.themes and tags.elements)
    if (scope === 'concepts' && concepts && concepts.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => {
        const questionThemes = q.tags?.themes || [];
        const questionElements = q.tags?.elements || [];
        return concepts.some(concept => 
          questionThemes.includes(concept) || 
          questionElements.some(el => el.includes(concept))
        );
      });
    }

    // Filter by difficulty
    if (difficulty && difficulty.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.tags?.difficulty && difficulty.includes(q.tags.difficulty as any)
      );
    }

    // 3. Fetch user's SRS progress for this book
    const srsItems = await queryItems(PROGRESS_TABLE, userPk, `srs#${bookId}#`);
    const srsMap = new Map<string, SrsProgress>();
    
    for (const item of srsItems) {
      // Extract questionId from SK: srs#{bookId}#{questionId}
      const parts = item.SK.split('#');
      if (parts.length >= 3) {
        const questionId = parts.slice(2).join('#');
        srsMap.set(questionId, item as SrsProgress);
      }
    }

    // 4. Categorize questions: due reviews vs new cards
    const dueReviews: AssessmentQuestionWithSrs[] = [];
    const newCards: AssessmentQuestionWithSrs[] = [];

    for (const question of filteredQuestions) {
      const srsProgress = srsMap.get(question.id);
      
      const questionWithSrs: AssessmentQuestionWithSrs = {
        id: question.id,
        bookId: question.bookId || bookId,
        chapterNumber: question.chapterNumber || extractChapterFromQuestionId(question.id),
        type: question.type as AssessmentQuestionWithSrs['type'],
        text: question.text,
        options: question.options,
        correctAnswer: question.correctAnswer,
        acceptableAnswers: question.acceptableAnswers,
        rubric: question.rubric,
        hints: question.hints || [],
        explanation: question.explanation,
        tags: {
          difficulty: (question.tags?.difficulty || 'medium') as AssessmentQuestionWithSrs['tags']['difficulty'],
          themes: question.tags?.themes || [],
          elements: question.tags?.elements || [],
          style: question.tags?.style,
          motifs: question.tags?.motifs,
          literaryDevices: question.tags?.literaryDevices,
        },
        srsData: srsProgress ? {
          box: srsProgress.box,
          dueDate: srsProgress.dueDate,
          isNew: false,
          intervalDays: srsProgress.intervalDays,
        } : {
          box: 0,
          dueDate: today,
          isNew: true,
          intervalDays: 1,
        }
      };

      if (srsProgress) {
        // Card has been seen before
        if (srsProgress.dueDate <= today) {
          dueReviews.push(questionWithSrs);
        }
        // Not due yet - skip
      } else {
        // New card
        newCards.push(questionWithSrs);
      }
    }

    // 5. Sort due reviews by dueDate (oldest first)
    dueReviews.sort((a, b) => {
      const dateA = a.srsData?.dueDate || '';
      const dateB = b.srsData?.dueDate || '';
      return dateA.localeCompare(dateB);
    });

    // 6. Shuffle new cards
    shuffleArray(newCards);

    // 7. Calculate how many new cards to include based on mode
    const maxNewCards = MAX_NEW_CARDS[mode] || MAX_NEW_CARDS.Standard;
    const newCardsToInclude = newCards.slice(0, maxNewCards);

    // 8. Combine: due reviews first, then new cards
    let batch = [...dueReviews, ...newCardsToInclude];

    // 9. Cap at max per session
    batch = batch.slice(0, MAX_REVIEW_CARDS_PER_SESSION);

    // 10. Calculate metadata
    const metadata = {
      totalDueToday: dueReviews.length,
      newToday: newCardsToInclude.length,
      reviewToday: Math.min(dueReviews.length, MAX_REVIEW_CARDS_PER_SESSION - newCardsToInclude.length),
      streak: await calculateStreak(userPk, bookId),
    };

    // 11. Handle Quick mode with no due cards
    let message: string | undefined;
    if (mode === 'Quick' && dueReviews.length === 0) {
      message = "You're all caught up! No cards due for review.";
    }

    const response: SrsGetBatchResponse = {
      questions: batch,
      metadata,
      message,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Error in srsGetBatch:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Calculate user's study streak (consecutive days with reviews)
 * Simple implementation - can be enhanced later
 */
async function calculateStreak(userPk: string, bookId: string): Promise<number> {
  // For MVP, return 0. Can implement proper streak tracking later.
  // Would need to track daily activity in a separate item.
  return 0;
}
