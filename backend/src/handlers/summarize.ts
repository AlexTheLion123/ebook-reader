import { APIGatewayProxyHandler } from 'aws-lambda';
import { getItem, putItem } from '../utils/dynamodb';
import { getObject } from '../utils/s3';
import { generateChapterSummary } from '../utils/bedrock';
import { SummarizeRequest } from '../types';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { bookId, chapterNumber }: SummarizeRequest = JSON.parse(event.body || '{}');

    if (!bookId || !chapterNumber) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'bookId and chapterNumber required' }) 
      };
    }

    const pk = `book#${bookId}`;
    const chapterSK = `chapter#${chapterNumber}`;
    const summarySK = `summary#${chapterNumber}`;

    // Check if summary already exists (cached)
    const cachedSummary = await getItem(process.env.CONTENT_TABLE!, { PK: pk, SK: summarySK });
    if (cachedSummary?.summary) {
      console.log(`Returning cached summary for ${bookId} chapter ${chapterNumber}`);
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          summary: cachedSummary.summary, 
          bookId, 
          chapterNumber,
          cached: true 
        })
      };
    }

    // Get chapter metadata
    const chapter = await getItem(process.env.CONTENT_TABLE!, { PK: pk, SK: chapterSK });
    if (!chapter) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Chapter not found' }) };
    }

    // Get chapter content - use textContent if available (TeX books), otherwise fetch from S3
    let textContent: string;
    if (chapter.textContent) {
      textContent = chapter.textContent;
    } else if (chapter.s3Key) {
      const contentBuffer = await getObject(process.env.BOOKS_BUCKET!, chapter.s3Key);
      const htmlContent = contentBuffer.toString('utf-8');
      textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      return { statusCode: 404, body: JSON.stringify({ error: 'Chapter content not available' }) };
    }

    // Generate summary using Bedrock
    console.log(`Generating summary for ${bookId} chapter ${chapterNumber}`);
    const summary = await generateChapterSummary(textContent, chapter.title || `Chapter ${chapterNumber}`);

    // Cache the summary
    await putItem(process.env.CONTENT_TABLE!, {
      PK: pk,
      SK: summarySK,
      type: 'summary',
      chapterNumber,
      summary,
      generatedAt: Date.now()
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ summary, bookId, chapterNumber, cached: false })
    };
  } catch (error) {
    console.error('Summary generation error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to generate summary', details: String(error) }) 
    };
  }
};
