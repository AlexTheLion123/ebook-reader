import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../utils/dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  const bookId = event.pathParameters?.bookId;
  
  if (!bookId) {
    return { 
      statusCode: 400, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'bookId required' }) 
    };
  }

  try {
    const items = await query(
      process.env.CONTENT_TABLE!,
      'PK = :pk',
      { ':pk': `book#${bookId}` }
    );

    const metadata = items.find(item => item.SK === 'metadata');

    if (!metadata) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ bookId, status: 'none' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        bookId, 
        status: metadata.processingStatus || 'pending',
        error: metadata.processingError,
        chaptersProcessed: metadata.chaptersProcessed,
        paragraphsProcessed: metadata.paragraphsProcessed
      })
    };
  } catch (error) {
    console.error('Status check error:', error);
    return { 
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to check status' }) 
    };
  }
};
