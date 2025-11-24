import { APIGatewayProxyHandler } from 'aws-lambda';
import { updateItem, getItem } from '../utils/dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const bookId = event.pathParameters?.bookId;
    const { hidden } = JSON.parse(event.body || '{}');
    
    if (!bookId) {
      return { 
        statusCode: 400, 
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'bookId required' }) 
      };
    }

    if (typeof hidden !== 'boolean') {
      return { 
        statusCode: 400, 
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'hidden must be a boolean' }) 
      };
    }

    const tableName = process.env.CONTENT_TABLE!;
    const key = { PK: `book#${bookId}`, SK: 'metadata' };

    // Check if book exists
    const book = await getItem(tableName, key);
    if (!book) {
      return { 
        statusCode: 404, 
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Book not found' }) 
      };
    }

    // Update hidden status (using ExpressionAttributeNames because 'hidden' is a reserved keyword)
    await updateItem(
      tableName,
      key,
      'SET #hidden = :hidden, updatedAt = :updatedAt',
      { ':hidden': hidden, ':updatedAt': Date.now() },
      { '#hidden': 'hidden' }
    );

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        message: hidden ? 'Book hidden successfully' : 'Book unhidden successfully',
        bookId,
        hidden
      })
    };
  } catch (error) {
    console.error('Hide book error:', error);
    return { 
      statusCode: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to update book visibility' }) 
    };
  }
};
