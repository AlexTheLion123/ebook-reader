import { SNSHandler } from 'aws-lambda';
import { updateItem } from '../utils/dynamodb';

export const handler: SNSHandler = async (event) => {
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.Sns.Message);
      
      // Extract bookId from the S3 key in the error message
      const requestPayload = message.requestPayload;
      if (requestPayload?.Records) {
        for (const s3Record of requestPayload.Records) {
          const key = s3Record.s3.object.key;
          const bookId = key.split('/')[0];
          
          console.log(`Marking book ${bookId} as failed due to processing error`);
          
          // Update status to failed
          await updateItem(
            process.env.CONTENT_TABLE!,
            { PK: `book#${bookId}`, SK: 'metadata' },
            'SET processingStatus = :status, #error = :error, processingFailedAt = :time',
            { 
              ':status': 'failed', 
              ':error': 'Processing failed - check CloudWatch logs',
              ':time': Date.now()
            },
            { '#error': 'error' }
          );
          
          console.log(`Successfully marked book ${bookId} as failed`);
        }
      }
    } catch (error) {
      console.error('Error handling processing failure:', error);
    }
  }
};
