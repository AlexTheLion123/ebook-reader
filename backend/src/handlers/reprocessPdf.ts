import { APIGatewayProxyHandler } from 'aws-lambda';
import { getObject } from '../utils/s3';
import { putItem, getItem } from '../utils/dynamodb';
import { PDFParse } from 'pdf-parse';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { bookId } = JSON.parse(event.body || '{}');
    
    if (!bookId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'bookId required' }) };
    }

    // Get book metadata to find S3 key
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

    const bucket = process.env.PDF_BUCKET!;
    const key = metadata.s3Key;

    console.log(`Reprocessing PDF: ${key}`);

    // Download PDF from S3
    const pdfBuffer = await getObject(bucket, key);
    
    // Parse PDF using v2 API
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    await parser.destroy();
    
    const fullText = result.text;
    
    // Split into chapters
    const chapterRegex = /Chapter\s+(\d+)[:\s]+(.*?)(?=Chapter\s+\d+|$)/gis;
    const matches = [...fullText.matchAll(chapterRegex)];
    
    let chaptersProcessed = 0;
    let paragraphsProcessed = 0;

    if (matches.length === 0) {
      // No chapters found, store entire content as single chapter
      await putItem(process.env.CONTENT_TABLE!, {
        PK: `book#${bookId}`,
        SK: `chapter#1#paragraph#1`,
        type: 'content',
        chapterNumber: 1,
        paragraphNumber: 1,
        paragraphText: fullText.trim()
      });
      chaptersProcessed = 1;
      paragraphsProcessed = 1;
    } else {
      // Store each chapter
      for (const match of matches) {
        const chapterNum = parseInt(match[1]);
        const chapterText = match[0].trim();
        
        // Split chapter into paragraphs
        const paragraphs = chapterText.split(/\n\n+/).filter((p: string) => p.trim().length > 0);
        
        for (let i = 0; i < paragraphs.length; i++) {
          await putItem(process.env.CONTENT_TABLE!, {
            PK: `book#${bookId}`,
            SK: `chapter#${chapterNum}#paragraph#${i + 1}`,
            type: 'content',
            chapterNumber: chapterNum,
            paragraphNumber: i + 1,
            paragraphText: paragraphs[i].trim()
          });
          paragraphsProcessed++;
        }
        
        chaptersProcessed++;
      }
    }

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
