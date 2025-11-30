/**
 * SRS Chapter Stats Handler
 * 
 * GET /srs/chapter-stats/{bookId}
 * 
 * Returns chapter mastery statistics for the chapter map visualization.
 * Uses actual SRS progress data to determine:
 * - Green (mastered): ≥80% of chapter questions in Box 5 or 6
 * - Yellow (in-progress): At least 1 question seen, but <80% in Box 5-6
 * - Gray (untouched): Zero questions from this chapter have been seen
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONTENT_TABLE = process.env.CONTENT_TABLE!;
const PROGRESS_TABLE = process.env.PROGRESS_TABLE!;

interface ChapterMasteryStats {
  chapterNumber: number;
  totalQuestions: number;
  seenCount: number;
  masteredCount: number;  // Box 5 or 6
  dueCount: number;
  newCount: number;
  status: 'mastered' | 'in-progress' | 'untouched';
  percentage: number;
}

interface ChapterStatsResponse {
  bookId: string;
  chapters: ChapterMasteryStats[];
  overall: {
    totalQuestions: number;
    masteredCount: number;
    percentage: number;
    streak: number;
  };
  concepts: Array<{
    name: string;
    score: number;
  }>;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const bookId = event.pathParameters?.bookId;
    if (!bookId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing bookId parameter' }),
      };
    }

    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - user not authenticated' }),
      };
    }

    // Step 1: Get all questions for this book to know total per chapter
    const questionsByChapter = await getQuestionsByChapter(bookId);
    
    // Step 2: Get user's SRS progress for this book
    const srsProgress = await getUserSrsProgress(userId, bookId);

    // Step 3: Calculate stats per chapter
    const today = new Date().toISOString().split('T')[0];
    const chapterStats: ChapterMasteryStats[] = [];
    
    // Get all chapter numbers from questions
    const chapterNumbers = Array.from(new Set([
      ...Object.keys(questionsByChapter).map(Number),
      ...srsProgress.map(p => p.chapterNumber).filter(Boolean)
    ])).sort((a, b) => a - b);

    let totalQuestions = 0;
    let totalMastered = 0;
    let maxStreak = 0;

    // Track concept scores
    const conceptScores: Record<string, { seen: number; mastered: number }> = {};

    for (const chapterNum of chapterNumbers) {
      const chapterQuestions = questionsByChapter[chapterNum] || [];
      const chapterProgress = srsProgress.filter(p => p.chapterNumber === chapterNum);
      
      // Count by box
      const boxCounts: Record<number, number> = {};
      let dueCount = 0;
      
      for (const progress of chapterProgress) {
        const box = progress.box || 0;
        boxCounts[box] = (boxCounts[box] || 0) + 1;
        
        // Check if due
        if (progress.dueDate && progress.dueDate <= today) {
          dueCount++;
        }

        // Track streak
        if (progress.consecutiveCorrect && progress.consecutiveCorrect > maxStreak) {
          maxStreak = progress.consecutiveCorrect;
        }

        // Track concept scores from question tags
        const question = chapterQuestions.find(q => q.id === progress.questionId);
        if (question?.tags) {
          const themes = question.tags.themes || [];
          const elements = question.tags.elements || [];
          const allConcepts = [...themes, ...elements];
          
          for (const concept of allConcepts) {
            if (!conceptScores[concept]) {
              conceptScores[concept] = { seen: 0, mastered: 0 };
            }
            conceptScores[concept].seen++;
            if (box >= 5) {
              conceptScores[concept].mastered++;
            }
          }
        }
      }

      const seenCount = chapterProgress.length;
      const masteredCount = (boxCounts[5] || 0) + (boxCounts[6] || 0);
      const totalInChapter = chapterQuestions.length;
      const newCount = totalInChapter - seenCount;

      // Determine status
      let status: 'mastered' | 'in-progress' | 'untouched';
      if (seenCount === 0) {
        status = 'untouched';
      } else if (totalInChapter > 0 && masteredCount / totalInChapter >= 0.80) {
        status = 'mastered';
      } else {
        status = 'in-progress';
      }

      const percentage = totalInChapter > 0 
        ? Math.round((masteredCount / totalInChapter) * 100) 
        : 0;

      chapterStats.push({
        chapterNumber: chapterNum,
        totalQuestions: totalInChapter,
        seenCount,
        masteredCount,
        dueCount,
        newCount,
        status,
        percentage,
      });

      totalQuestions += totalInChapter;
      totalMastered += masteredCount;
    }

    // Calculate concept percentages
    const concepts = Object.entries(conceptScores)
      .map(([name, scores]) => ({
        name: formatConceptName(name),
        score: scores.seen > 0 ? Math.round((scores.mastered / scores.seen) * 100) : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6); // Top 6 concepts

    const response: ChapterStatsResponse = {
      bookId,
      chapters: chapterStats,
      overall: {
        totalQuestions,
        masteredCount: totalMastered,
        percentage: totalQuestions > 0 ? Math.round((totalMastered / totalQuestions) * 100) : 0,
        streak: maxStreak,
      },
      concepts,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error fetching chapter stats:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch chapter stats' }),
    };
  }
};

/**
 * Get all questions grouped by chapter for a book
 */
async function getQuestionsByChapter(bookId: string): Promise<Record<number, any[]>> {
  const result: Record<number, any[]> = {};
  
  try {
    // Query all question items for this book
    const response = await docClient.send(new QueryCommand({
      TableName: CONTENT_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `book#${bookId}`,
        ':sk': 'questions#',
      },
    }));

    for (const item of response.Items || []) {
      // SK format: questions#1, questions#2, etc.
      const chapterNum = parseInt(item.SK.replace('questions#', ''), 10);
      const questions = item.questions || [];
      
      // Add chapter number and question ID to each question
      result[chapterNum] = questions.map((q: any, idx: number) => ({
        ...q,
        id: q.id || `q-ch${chapterNum}-${idx}`,
        chapterNumber: chapterNum,
      }));
    }
  } catch (error) {
    console.error('Error fetching questions:', error);
  }

  return result;
}

/**
 * Get user's SRS progress for a specific book
 */
async function getUserSrsProgress(userId: string, bookId: string): Promise<any[]> {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: PROGRESS_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `user#${userId}`,
        ':sk': `srs#${bookId}#`,
      },
    }));

    return (response.Items || []).map(item => ({
      ...item,
      questionId: item.SK.replace(`srs#${bookId}#`, ''),
    }));
  } catch (error) {
    console.error('Error fetching SRS progress:', error);
    return [];
  }
}

/**
 * Format concept name for display
 */
function formatConceptName(name: string): string {
  // Capitalize first letter of each word
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
