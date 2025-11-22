import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryItems } from '../utils/dynamodb';
import { invokeModel } from '../utils/bedrock';
import { AskRequest } from '../types';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, bookId, query }: AskRequest = JSON.parse(event.body || '{}');

    if (!userId || !bookId || !query) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId, bookId, and query required' }) };
    }

    // Retrieve content (simple: get all paragraphs for now)
    const items = await queryItems(process.env.CONTENT_TABLE!, `book#${bookId}`, 'chapter#');
    
    if (!items.length) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No content found for book' }) };
    }

    // Build context from paragraphs
    const context = items
      .slice(0, 10) // Limit to first 10 paragraphs for MVP
      .map((item, idx) => `[${idx}] ${item.paragraphText}`)
      .join('\n\n');

    const systemPrompt = 'You are a helpful study assistant. Use only the provided context to answer questions. Cite sources using [number] format.';
    const prompt = `CONTEXT:\n${context}\n\nQUESTION: ${query}\n\nANSWER:`;

    const answer = await invokeModel(prompt, systemPrompt);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ answer, userId, bookId })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process question' }) };
  }
};
