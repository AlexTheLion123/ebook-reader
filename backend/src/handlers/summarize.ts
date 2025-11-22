import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryItems } from '../utils/dynamodb';
import { invokeModel } from '../utils/bedrock';
import { SummarizeRequest } from '../types';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, bookId, chapter }: SummarizeRequest = JSON.parse(event.body || '{}');

    if (!userId || !bookId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId and bookId required' }) };
    }

    const pk = `book#${bookId}`;
    const skPrefix = chapter ? `chapter#${chapter}#` : 'chapter#';
    const items = await queryItems(process.env.CONTENT_TABLE!, pk, skPrefix);

    if (!items.length) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No content found' }) };
    }

    const context = items.map(item => item.paragraphText).join('\n\n');
    const systemPrompt = 'You are a helpful study assistant. Provide concise summaries with key points.';
    const prompt = `Summarize the following content in 3-6 sentences with a 1-sentence TL;DR:\n\n${context}`;

    const summary = await invokeModel(prompt, systemPrompt);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ summary, bookId, chapter })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate summary' }) };
  }
};
