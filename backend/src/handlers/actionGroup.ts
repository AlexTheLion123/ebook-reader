/**
 * Bedrock Agent Action Group Handler
 * 
 * This Lambda function handles action group invocations from the Bedrock Agent.
 * It exposes existing functionality (quiz generation, hints, evaluation) as tools
 * that the agent can call during conversation.
 * 
 * Each tool is called based on the actionGroup and function name from the agent.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { invokeModel } from '../utils/bedrock';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });

const CONTENT_TABLE = process.env.CONTENT_TABLE!;
const PROGRESS_TABLE = process.env.PROGRESS_TABLE!;
const BOOKS_BUCKET = process.env.BOOKS_BUCKET!;

/**
 * Bedrock Agent action group event format
 */
interface ActionGroupEvent {
  messageVersion: string;
  agent: {
    name: string;
    id: string;
    alias: string;
    version: string;
  };
  inputText: string;
  sessionId: string;
  actionGroup: string;
  function: string;
  parameters: Array<{
    name: string;
    type: string;
    value: string;
  }>;
  sessionAttributes: Record<string, string>;
  promptSessionAttributes: Record<string, string>;
}

/**
 * Bedrock Agent action group response format
 */
interface ActionGroupResponse {
  messageVersion: string;
  response: {
    actionGroup: string;
    function: string;
    functionResponse: {
      responseBody: {
        TEXT: {
          body: string;
        };
      };
    };
  };
}

/**
 * Get parameter value from event
 */
function getParam(event: ActionGroupEvent, name: string): string | undefined {
  const param = event.parameters.find(p => p.name === name);
  return param?.value;
}

/**
 * Get chapter content from DynamoDB/S3
 */
async function getChapterContent(bookId: string, chapterNumber: number): Promise<string> {
  const chapter = await docClient.send(new GetCommand({
    TableName: CONTENT_TABLE,
    Key: { PK: `book#${bookId}`, SK: `chapter#${chapterNumber}` }
  }));

  if (!chapter.Item) {
    throw new Error(`Chapter ${chapterNumber} not found for book ${bookId}`);
  }

  // Use textContent if available (TeX books), otherwise fetch from S3
  if (chapter.Item.textContent) {
    return chapter.Item.textContent;
  }

  if (chapter.Item.s3Key) {
    const s3Response = await s3Client.send(new GetObjectCommand({
      Bucket: BOOKS_BUCKET,
      Key: chapter.Item.s3Key
    }));
    const htmlContent = await s3Response.Body?.transformToString('utf-8') || '';
    return htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  throw new Error('Chapter content not available');
}

/**
 * Generate a quiz based on chapter content
 */
async function generateQuiz(bookId: string, chapterNumber: number, topic?: string, difficulty?: string, questionCount = 5): Promise<string> {
  const content = await getChapterContent(bookId, chapterNumber);
  
  const difficultyInstructions = {
    easy: 'Focus on basic concepts and definitions. Questions should be straightforward.',
    medium: 'Include application questions and some problem-solving. Moderate complexity.',
    hard: 'Include challenging problems, proofs, and multi-step reasoning. Advanced level.'
  };

  const prompt = `Based on this chapter content, generate ${questionCount} ${difficulty || 'medium'} difficulty quiz questions${topic ? ` about "${topic}"` : ''}.

Chapter content:
${content.slice(0, 30000)}

${difficulty ? difficultyInstructions[difficulty as keyof typeof difficultyInstructions] || '' : ''}

Return a JSON array:
[
  {
    "question": "Question text with LaTeX math in $...$ if needed",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": 0,
    "explanation": "Why this is correct, with reference to the chapter"
  }
]`;

  const response = await invokeModel(prompt, 'You are a helpful tutor creating quiz questions.', { maxTokens: 2000 });
  
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return JSON.stringify([{ question: 'Quiz generation failed', options: [], correctAnswer: 0, explanation: 'Please try again' }]);
  }

  return jsonMatch[0];
}

/**
 * Get a progressive hint for a question
 */
async function getHint(bookId: string, chapterNumber: number, question: string, hintLevel: number): Promise<string> {
  const content = await getChapterContent(bookId, chapterNumber);
  
  const hintPrompts: Record<number, string> = {
    1: `Provide a SUBTLE hint that nudges toward the right direction without giving away the answer. Ask a guiding question or point to a relevant concept. Keep it brief (2-3 sentences).`,
    2: `Provide a MODERATE hint that points to the specific concept or section in the content. Explain the reasoning approach without solving it. Give a concrete example or analogy if helpful.`,
    3: `Provide a DETAILED explanation walking through the reasoning step-by-step. Explain the key concept clearly. Help them understand WHY the answer is what it is, but stop just short of stating the exact answer.`
  };

  const prompt = `A student is working on this question: "${question}"

${hintPrompts[hintLevel] || hintPrompts[1]}

Relevant content:
${content.substring(0, 5000)}`;

  return await invokeModel(prompt, 'You are a patient and encouraging tutor using the Socratic method.', { maxTokens: 500 });
}

/**
 * Evaluate a student's answer
 */
async function evaluateAnswer(question: string, studentAnswer: string, correctAnswer?: string): Promise<string> {
  const prompt = `Evaluate this student's answer:

Question: ${question}
Student Answer: ${studentAnswer}
${correctAnswer ? `Expected Answer: ${correctAnswer}` : ''}

Provide a JSON response:
{
  "score": 0.0-1.0,
  "isCorrect": true/false,
  "feedback": "Constructive feedback explaining what's right/wrong",
  "suggestion": "How to improve or what to study next"
}`;

  const response = await invokeModel(prompt, 'You are a fair and encouraging grader.', { maxTokens: 500 });
  
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : JSON.stringify({ score: 0, isCorrect: false, feedback: 'Unable to evaluate answer' });
}

/**
 * Track student progress
 */
async function trackProgress(userId: string, bookId: string, chapterNumber: number, activity: string, score?: number): Promise<string> {
  const timestamp = Date.now();
  
  // Update progress record
  await docClient.send(new UpdateCommand({
    TableName: PROGRESS_TABLE,
    Key: { 
      PK: `user#${userId}`,
      SK: `book#${bookId}#chapter#${chapterNumber}`
    },
    UpdateExpression: 'SET lastActivity = :activity, lastSeen = :timestamp, #score = if_not_exists(#score, :zero) + :scoreAdd',
    ExpressionAttributeNames: {
      '#score': 'totalScore'
    },
    ExpressionAttributeValues: {
      ':activity': activity,
      ':timestamp': timestamp,
      ':zero': 0,
      ':scoreAdd': score || 0
    }
  }));

  return JSON.stringify({
    success: true,
    message: `Progress tracked: ${activity} on chapter ${chapterNumber}`,
    timestamp
  });
}

/**
 * Get pre-generated chapter summary from DynamoDB
 * This avoids KB semantic search issues with chapter numbers
 */
async function getChapterSummary(bookId: string, chapterNumber: number): Promise<string> {
  // Look up pre-generated summary by exact chapter number
  const result = await docClient.send(new GetCommand({
    TableName: CONTENT_TABLE,
    Key: { 
      PK: `book#${bookId}`, 
      SK: `summary#${chapterNumber}` 
    }
  }));

  if (result.Item?.summary) {
    return JSON.stringify({
      chapterNumber,
      summary: result.Item.summary,
      cached: true
    });
  }

  // If no pre-generated summary, generate one on the fly
  try {
    const content = await getChapterContent(bookId, chapterNumber);
    
    const prompt = `Summarize this chapter content in 2-3 paragraphs. Include key events, character interactions, and important developments.

Chapter content:
${content.slice(0, 30000)}`;

    const summary = await invokeModel(prompt, 'You are a helpful literary assistant summarizing book chapters.', { maxTokens: 800 });
    
    // Cache for future requests
    await docClient.send(new PutCommand({
      TableName: CONTENT_TABLE,
      Item: {
        PK: `book#${bookId}`,
        SK: `summary#${chapterNumber}`,
        type: 'summary',
        chapterNumber,
        summary,
        generatedAt: Date.now()
      }
    }));

    return JSON.stringify({
      chapterNumber,
      summary,
      cached: false
    });
  } catch (error) {
    return JSON.stringify({
      error: `Could not generate summary for chapter ${chapterNumber}`,
      details: String(error)
    });
  }
}

/**
 * Get student's learning summary
 */
async function getLearningSummary(userId: string, bookId: string): Promise<string> {
  const result = await docClient.send(new QueryCommand({
    TableName: PROGRESS_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `user#${userId}`,
      ':sk': `book#${bookId}`
    }
  }));

  const chapters = result.Items || [];
  
  return JSON.stringify({
    bookId,
    chaptersStudied: chapters.length,
    totalScore: chapters.reduce((sum, ch) => sum + (ch.totalScore || 0), 0),
    lastActivity: chapters.length > 0 ? 
      Math.max(...chapters.map(ch => ch.lastSeen || 0)) : null,
    details: chapters.map(ch => ({
      chapter: ch.SK.split('#')[3],
      score: ch.totalScore || 0,
      lastActivity: ch.lastActivity
    }))
  });
}

/**
 * Main handler for action group invocations
 */
export const handler = async (event: ActionGroupEvent): Promise<ActionGroupResponse> => {
  console.log('Action group event:', JSON.stringify(event, null, 2));
  
  const { actionGroup, function: functionName, sessionAttributes } = event;
  const bookId = sessionAttributes.bookId || getParam(event, 'bookId') || '';
  const userId = sessionAttributes.userId || event.sessionId;
  
  let responseBody: string;
  
  try {
    switch (functionName) {
      case 'generateQuiz': {
        const chapterNumber = parseInt(getParam(event, 'chapterNumber') || '1');
        const topic = getParam(event, 'topic');
        const difficulty = getParam(event, 'difficulty');
        const count = parseInt(getParam(event, 'questionCount') || '5');
        
        responseBody = await generateQuiz(bookId, chapterNumber, topic, difficulty, count);
        break;
      }
      
      case 'getHint': {
        const chapterNumber = parseInt(getParam(event, 'chapterNumber') || '1');
        const question = getParam(event, 'question') || '';
        const hintLevel = parseInt(getParam(event, 'hintLevel') || '1');
        
        responseBody = await getHint(bookId, chapterNumber, question, hintLevel);
        break;
      }
      
      case 'evaluateAnswer': {
        const question = getParam(event, 'question') || '';
        const studentAnswer = getParam(event, 'studentAnswer') || '';
        const correctAnswer = getParam(event, 'correctAnswer');
        
        responseBody = await evaluateAnswer(question, studentAnswer, correctAnswer);
        break;
      }
      
      case 'trackProgress': {
        const chapterNumber = parseInt(getParam(event, 'chapterNumber') || '1');
        const activity = getParam(event, 'activity') || 'study';
        const score = parseFloat(getParam(event, 'score') || '0');
        
        responseBody = await trackProgress(userId, bookId, chapterNumber, activity, score);
        break;
      }
      
      case 'getLearningSummary': {
        responseBody = await getLearningSummary(userId, bookId);
        break;
      }
      
      case 'getChapterSummary': {
        const chapterNumber = parseInt(getParam(event, 'chapterNumber') || '1');
        responseBody = await getChapterSummary(bookId, chapterNumber);
        break;
      }
      
      default:
        responseBody = JSON.stringify({ error: `Unknown function: ${functionName}` });
    }
  } catch (error) {
    console.error('Action group error:', error);
    responseBody = JSON.stringify({ 
      error: `Failed to execute ${functionName}`,
      details: String(error)
    });
  }
  
  return {
    messageVersion: '1.0',
    response: {
      actionGroup,
      function: functionName,
      functionResponse: {
        responseBody: {
          TEXT: {
            body: responseBody
          }
        }
      }
    }
  };
};
