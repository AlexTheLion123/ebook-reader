/**
 * SRS Submit Answer Handler
 * 
 * POST /srs/submit-answer
 * 
 * Updates SRS progress based on user's self-rating (Again/Hard/Good/Easy).
 * Creates new SRS record if this is the first time seeing the question.
 */

import { APIGatewayProxyHandler } from 'aws-lambda';
import { getItem, putItem } from '../utils/dynamodb';
import { 
  updateSrsProgress, 
  createNewSrsProgress,
  extractChapterFromQuestionId,
  previewIntervals
} from '../utils/srsAlgorithm';
import { 
  SrsSubmitRequest, 
  SrsSubmitResponse, 
  SrsProgress,
  SrsRating
} from '../types';

const PROGRESS_TABLE = process.env.PROGRESS_TABLE!;

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
    const body: SrsSubmitRequest = JSON.parse(event.body || '{}');
    const { bookId, questionId, userAnswer, rating, questionFormat } = body;

    // Validate required fields
    if (!bookId || !questionId || !rating) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: bookId, questionId, rating' 
        }),
      };
    }

    // Validate rating
    const validRatings: SrsRating[] = ['Again', 'Hard', 'Good', 'Easy'];
    if (!validRatings.includes(rating)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Invalid rating. Must be one of: ${validRatings.join(', ')}` 
        }),
      };
    }

    const userPk = `user#${userId}`;
    const srsSk = `srs#${bookId}#${questionId}`;

    // Fetch existing SRS progress (if any)
    const existingProgress = await getItem(PROGRESS_TABLE, { 
      PK: userPk, 
      SK: srsSk 
    }) as SrsProgress | undefined;

    let updatedProgress: SrsProgress;

    if (existingProgress) {
      // Update existing progress
      updatedProgress = updateSrsProgress(existingProgress, rating, questionFormat);
    } else {
      // Create new progress for first-time question
      const chapterNumber = extractChapterFromQuestionId(questionId);
      const newProgress = createNewSrsProgress(userId, bookId, questionId, chapterNumber);
      
      // Apply the rating to the new progress
      updatedProgress = updateSrsProgress(newProgress, rating, questionFormat);
    }

    // Save updated progress to DynamoDB
    await putItem(PROGRESS_TABLE, updatedProgress);

    // Calculate streak (simplified - just return consecutive correct)
    const streak = updatedProgress.consecutiveCorrect;

    const response: SrsSubmitResponse = {
      success: true,
      isCorrect: rating !== 'Again', // Again means wrong
      newBox: updatedProgress.box,
      newDueDate: updatedProgress.dueDate,
      intervalDays: updatedProgress.intervalDays,
      streak,
      totalReps: updatedProgress.totalReps,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Error in srsSubmitAnswer:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
