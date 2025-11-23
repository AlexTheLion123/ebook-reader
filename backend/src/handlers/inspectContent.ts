import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const bookId = event.pathParameters?.bookId;
    if (!bookId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'bookId required' }) };
    }

    const result = await docClient.send(new QueryCommand({
      TableName: process.env.CONTENT_TABLE!,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `book#${bookId}` }
    }));

    const items = result.Items || [];
    const contentItems = items.filter(item => item.type === 'content');
    
    // Calculate statistics
    const totalChars = contentItems.reduce((sum, item) => sum + (item.paragraphText?.length || 0), 0);
    const avgCharsPerPage = totalChars / contentItems.length;
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        totalPages: contentItems.length,
        totalCharacters: totalChars,
        avgCharactersPerPage: Math.round(avgCharsPerPage),
        pages: contentItems.map(item => ({
          page: item.pageNumber,
          chapter: item.chapterNumber,
          paragraph: item.paragraphNumber,
          charCount: item.paragraphText?.length || 0,
          preview: item.paragraphText?.substring(0, 200) + '...',
          fullText: item.paragraphText
        }))
      }, null, 2)
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to inspect content' }) };
  }
};
