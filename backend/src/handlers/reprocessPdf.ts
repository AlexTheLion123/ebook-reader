import { APIGatewayProxyHandler } from 'aws-lambda';
import { getItem } from '../utils/dynamodb';
import { processPdfAndStore } from '../utils/pdfProcessor';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { bookId } = JSON.parse(event.body || '{}');
    
    if (!bookId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'bookId required' }) };
    }

    // Get book metadata to verify it exists
    const metadata = await getItem(process.env.CONTENT_TABLE!, {
      PK: `book#${bookId}`,
      SK: 'metadata'
    });

    if (!metadata || !metadata.s3Key) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'Book not found or no PDF uploaded' }) 
      };
    }

    console.log(`Reprocessing PDF for book: ${bookId}`);
    
    // Process PDF and store content (Textract reads from S3)
    const { chaptersProcessed, paragraphsProcessed } = await processPdfAndStore(
      process.env.BOOKS_BUCKET!,
      metadata.s3Key,
      bookId,
      process.env.CONTENT_TABLE!
    );

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: true,
        bookId,
        chaptersProcessed,
        paragraphsProcessed,
        message: 'PDF reprocessed successfully'
      })
    };
  } catch (error) {
    console.error('Reprocess error:', error);
    return { 
      statusCode: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to reprocess PDF' }) 
    };
  }
};
