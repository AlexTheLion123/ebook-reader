/**
 * Active Books Handler
 * 
 * Manages user's active book collection (books they're actively studying).
 * 
 * GET /user/active-books - List all active books for the user
 * POST /user/active-books - Add a book to active collection
 * DELETE /user/active-books/{bookId} - Remove a book from active collection
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PROGRESS_TABLE = process.env.PROGRESS_TABLE!;

interface ActiveBook {
  PK: string;           // user#${userId}
  SK: string;           // active-book#${bookId}
  type: string;         // 'active-book'
  bookId: string;
  bookTitle: string;
  addedAt: string;      // ISO timestamp
}

interface ActiveBookResponse {
  bookId: string;
  bookTitle: string;
  addedAt: string;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

/**
 * GET /user/active-books
 * Returns list of active books for the authenticated user
 */
async function listActiveBooks(userId: string): Promise<APIGatewayProxyResult> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: PROGRESS_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `user#${userId}`,
        ':sk': 'active-book#',
      },
    }));

    const activeBooks: ActiveBookResponse[] = (result.Items || []).map((item) => ({
      bookId: item.bookId,
      bookTitle: item.bookTitle,
      addedAt: item.addedAt,
    }));

    // Sort by addedAt descending (most recent first)
    activeBooks.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        activeBooks,
        count: activeBooks.length,
      }),
    };
  } catch (error) {
    console.error('Error listing active books:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to list active books' }),
    };
  }
}

/**
 * POST /user/active-books
 * Add a book to the user's active collection
 */
async function addActiveBook(userId: string, body: string): Promise<APIGatewayProxyResult> {
  try {
    const { bookId, bookTitle } = JSON.parse(body || '{}');

    if (!bookId || !bookTitle) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: bookId, bookTitle' }),
      };
    }

    const pk = `user#${userId}`;
    const sk = `active-book#${bookId}`;

    // Check if already exists
    const existing = await docClient.send(new GetCommand({
      TableName: PROGRESS_TABLE,
      Key: { PK: pk, SK: sk },
    }));

    if (existing.Item) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Book already in active collection',
          alreadyExists: true,
          bookId,
          bookTitle: existing.Item.bookTitle,
          addedAt: existing.Item.addedAt,
        }),
      };
    }

    const item: ActiveBook = {
      PK: pk,
      SK: sk,
      type: 'active-book',
      bookId,
      bookTitle,
      addedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: PROGRESS_TABLE,
      Item: item,
    }));

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Book added to active collection',
        bookId,
        bookTitle,
        addedAt: item.addedAt,
      }),
    };
  } catch (error) {
    console.error('Error adding active book:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to add book to active collection' }),
    };
  }
}

/**
 * DELETE /user/active-books/{bookId}
 * Remove a book from the user's active collection
 */
async function removeActiveBook(userId: string, bookId: string): Promise<APIGatewayProxyResult> {
  try {
    const pk = `user#${userId}`;
    const sk = `active-book#${bookId}`;

    // Check if exists
    const existing = await docClient.send(new GetCommand({
      TableName: PROGRESS_TABLE,
      Key: { PK: pk, SK: sk },
    }));

    if (!existing.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Book not found in active collection' }),
      };
    }

    await docClient.send(new DeleteCommand({
      TableName: PROGRESS_TABLE,
      Key: { PK: pk, SK: sk },
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Book removed from active collection',
        bookId,
      }),
    };
  } catch (error) {
    console.error('Error removing active book:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to remove book from active collection' }),
    };
  }
}

/**
 * Main handler - routes to appropriate function based on HTTP method
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

  const method = event.httpMethod;
  const bookId = event.pathParameters?.bookId;

  switch (method) {
    case 'GET':
      return listActiveBooks(userId);
    
    case 'POST':
      return addActiveBook(userId, event.body || '');
    
    case 'DELETE':
      if (!bookId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing bookId in path' }),
        };
      }
      return removeActiveBook(userId, bookId);
    
    default:
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: `Method ${method} not allowed` }),
      };
  }
};
