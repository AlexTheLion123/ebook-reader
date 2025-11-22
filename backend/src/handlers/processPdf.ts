import { S3Handler } from 'aws-lambda';
import { getObject } from '../utils/s3';
import { putItem } from '../utils/dynamodb';
import { PDFParse } from 'pdf-parse';

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing PDF: ${key}`);
    
    try {
      // Extract bookId from key (format: bookId/filename.pdf)
      const bookId = key.split('/')[0];
      
      // Download PDF from S3
      const pdfBuffer = await getObject(bucket, key);
      
      // Parse PDF using v2 API
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      await parser.destroy();
      
      const fullText = result.text;
      
      // Split into chapters (simple heuristic: split by "Chapter" keyword)
      const chapterRegex = /Chapter\s+(\d+)[:\s]+(.*?)(?=Chapter\s+\d+|$)/gis;
      const matches = [...fullText.matchAll(chapterRegex)];
      
      if (matches.length === 0) {
        // No chapters found, store entire content as single chapter
        console.log(`No chapters detected, storing as single chapter`);
        await putItem(process.env.CONTENT_TABLE!, {
          PK: `book#${bookId}`,
          SK: `chapter#1#paragraph#1`,
          type: 'content',
          chapterNumber: 1,
          paragraphNumber: 1,
          paragraphText: fullText.trim()
        });
      } else {
        // Store each chapter
        for (const match of matches) {
          const chapterNum = parseInt(match[1]);
          const chapterText = match[0].trim();
          
          // Split chapter into paragraphs (by double newline)
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
          }
          
          console.log(`Stored chapter ${chapterNum} with ${paragraphs.length} paragraphs`);
        }
      }
      
      console.log(`Successfully processed PDF: ${key}`);
    } catch (error) {
      console.error(`Error processing PDF ${key}:`, error);
      throw error;
    }
  }
};
