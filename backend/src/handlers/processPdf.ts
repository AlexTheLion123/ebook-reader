import { S3Handler } from 'aws-lambda';
import { processPdfAndStore } from '../utils/pdfProcessor';

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing PDF: ${key}`);
    
    try {
      const bookId = key.split('/')[0];
      
      const { chaptersProcessed, paragraphsProcessed } = await processPdfAndStore(
        bucket,
        key,
        bookId,
        process.env.CONTENT_TABLE!
      );
      
      console.log(`Successfully processed PDF: ${key} - ${chaptersProcessed} chapters, ${paragraphsProcessed} paragraphs`);
    } catch (error) {
      console.error(`Error processing PDF ${key}:`, error);
      throw error;
    }
  }
};
