import { APIGatewayProxyHandler } from 'aws-lambda';
import { getItem } from '../utils/dynamodb';
import { getObject } from '../utils/s3';
import { answerQuestion } from '../utils/bedrock';
import { AskRequest } from '../types';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { bookId, chapterNumber, question }: AskRequest = JSON.parse(event.body || '{}');

    if (!bookId || !question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'bookId and question required' }) };
    }

    // Get book metadata for title
    const bookMeta = await getItem(process.env.CONTENT_TABLE!, { 
      PK: `book#${bookId}`, 
      SK: 'metadata' 
    });

    let context = '';

    if (chapterNumber) {
      // Question about specific chapter
      const chapter = await getItem(process.env.CONTENT_TABLE!, { 
        PK: `book#${bookId}`, 
        SK: `chapter#${chapterNumber}` 
      });
      
      if (!chapter?.s3Key) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Chapter not found' }) };
      }

      const contentBuffer = await getObject(process.env.BOOKS_BUCKET!, chapter.s3Key);
      const htmlContent = contentBuffer.toString('utf-8');
      context = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      // Question about entire book - use first chapter as context for now
      // TODO: Implement full RAG with embeddings for better cross-chapter search
      const chapter = await getItem(process.env.CONTENT_TABLE!, { 
        PK: `book#${bookId}`, 
        SK: 'chapter#1' 
      });
      
      if (!chapter?.s3Key) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Book content not found' }) };
      }

      const contentBuffer = await getObject(process.env.BOOKS_BUCKET!, chapter.s3Key);
      const htmlContent = contentBuffer.toString('utf-8');
      context = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const answer = await answerQuestion(question, context, bookMeta?.title);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ answer, bookId, chapterNumber })
    };
  } catch (error) {
    console.error('Question answering error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to process question', details: String(error) }) 
    };
  }
};
