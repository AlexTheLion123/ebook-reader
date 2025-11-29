import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryItems, getItem } from '../utils/dynamodb';

interface QuestionHint {
  level: 'small' | 'medium';
  text: string;
}

interface QuestionTags {
  difficulty: 'basic' | 'medium' | 'deep' | 'mastery';
  themes: string[];
  elements: string[];
}

interface AssessmentQuestion {
  id: string;
  bookId: string;
  chapterNumber: number;
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_BLANK' | 'BRIEF_RESPONSE';
  text: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  rubric?: string;
  hints: QuestionHint[];
  explanation: string;
  tags: QuestionTags;
}

interface GetQuestionsResponse {
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

/**
 * GET /questions/{bookId}
 * 
 * Query parameters:
 *   - chapters: comma-separated chapter numbers (e.g., "1,2,3")
 *   - difficulty: comma-separated difficulty levels (e.g., "basic,medium")
 *   - types: comma-separated question types (e.g., "MCQ,TRUE_FALSE")
 *   - limit: max number of questions to return (default: 50)
 *   - shuffle: randomize question order (default: true)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const bookId = event.pathParameters?.bookId;
    
    if (!bookId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'bookId is required' }),
      };
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    
    const chapters = queryParams.chapters
      ? queryParams.chapters.split(',').map(c => parseInt(c.trim(), 10)).filter(n => !isNaN(n))
      : null;
    
    const difficulties = queryParams.difficulty
      ? queryParams.difficulty.split(',').map(d => d.trim().toLowerCase())
      : null;
    
    const types = queryParams.types
      ? queryParams.types.split(',').map(t => t.trim().toUpperCase())
      : null;
    
    const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 50;
    const shuffle = queryParams.shuffle !== 'false'; // Default true

    const pk = `book#${bookId}`;
    
    // Fetch questions from DynamoDB
    let allQuestions: AssessmentQuestion[] = [];
    
    if (chapters && chapters.length > 0) {
      // Fetch specific chapters
      for (const chapterNum of chapters) {
        const item = await getItem(process.env.CONTENT_TABLE!, { PK: pk, SK: `questions#${chapterNum}` });
        if (item?.questions) {
          allQuestions.push(...item.questions);
        }
      }
    } else {
      // Fetch all chapters with questions (using prefix query)
      const questionItems = await queryItems(process.env.CONTENT_TABLE!, pk, 'questions#');
      for (const item of questionItems) {
        if (item.questions) {
          allQuestions.push(...item.questions);
        }
      }
    }

    // Apply filters
    let filteredQuestions = allQuestions;

    if (difficulties && difficulties.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.tags?.difficulty && difficulties.includes(q.tags.difficulty.toLowerCase())
      );
    }

    if (types && types.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        types.includes(q.type)
      );
    }

    // Shuffle if requested
    if (shuffle) {
      filteredQuestions = shuffleArray(filteredQuestions);
    }

    // Apply limit
    const totalBeforeLimit = filteredQuestions.length;
    if (limit > 0 && filteredQuestions.length > limit) {
      filteredQuestions = filteredQuestions.slice(0, limit);
    }

    const response: GetQuestionsResponse = {
      bookId,
      questions: filteredQuestions,
      totalCount: totalBeforeLimit,
      filters: {
        chapters: chapters || undefined,
        difficulty: difficulties || undefined,
        types: types || undefined,
        limit,
      },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error fetching questions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch questions', details: String(error) }),
    };
  }
};

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
