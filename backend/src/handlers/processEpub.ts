import { S3Handler } from 'aws-lambda';
import { processEpubAndStore } from '../utils/epubProcessor';

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing EPUB: ${key}`);
    
    try {
      const bookId = key.split('/')[0];
      
      const { chaptersProcessed } = await processEpubAndStore(
        bucket,
        key,
        bookId,
        process.env.CONTENT_TABLE!
      );
      
      console.log(`Successfully processed EPUB: ${key} - ${chaptersProcessed} chapters`);
    } catch (error) {
      console.error(`Error processing EPUB ${key}:`, error);
      throw error;
    }
  }
};
