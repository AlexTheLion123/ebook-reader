import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryItems } from '../utils/dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const bookId = event.pathParameters?.bookId;
    const chapter = event.queryStringParameters?.chapter;

    if (!bookId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'bookId required' }) };
    }

    const pk = `book#${bookId}`;
    const skPrefix = chapter ? `chapter#${chapter}#` : 'chapter#';
    
    const items = await queryItems(process.env.CONTENT_TABLE!, pk, skPrefix);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ bookId, items })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch content' }) };
  }
};
