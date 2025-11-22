import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryByType } from '../utils/dynamodb';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const books = await queryByType(process.env.CONTENT_TABLE!, 'book');
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ books })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to list books' }) };
  }
};
