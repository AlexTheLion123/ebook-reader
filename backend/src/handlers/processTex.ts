import { S3Handler } from 'aws-lambda';
import { processTexAndStore } from '../utils/texProcessor';

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing TeX file: ${key}`);
    
    try {
      const bookId = key.split('/')[0];
      
      const { chaptersProcessed } = await processTexAndStore(
        bucket,
        key,
        bookId,
        process.env.CONTENT_TABLE!
      );
      
      console.log(`Successfully processed TeX: ${key} - ${chaptersProcessed} chapters`);
    } catch (error) {
      console.error(`Error processing TeX ${key}:`, error);
      throw error;
    }
  }
};
