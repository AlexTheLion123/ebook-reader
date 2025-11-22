import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getItem, updateItem } from '../utils/dynamodb';

const s3 = new S3Client({});
const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const bookId = event.pathParameters?.bookId;

  if (!bookId) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'bookId is required' })
    };
  }

  try {
    // Get book metadata to find S3 key
    const metadata = await getItem(TABLE_NAME, { PK: `book#${bookId}`, SK: 'metadata' });
    
    if (!metadata || !metadata.s3Key) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Book not found' })
      };
    }

    // Verify file exists
    await s3.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: metadata.s3Key
    }));

    // Copy object to itself to trigger S3 event notification
    await s3.send(new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      Key: metadata.s3Key,
      CopySource: `${BUCKET_NAME}/${metadata.s3Key}`,
      MetadataDirective: 'REPLACE',
      Metadata: { reprocessed: Date.now().toString() }
    }));

    // Reset status to pending
    await updateItem(
      TABLE_NAME,
      { PK: `book#${bookId}`, SK: 'metadata' },
      'SET processingStatus = :status, reprocessedAt = :time',
      { ':status': 'pending', ':time': Date.now() }
    );

    return {
      statusCode: 202,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        message: 'Reprocessing started',
        bookId,
        status: 'pending'
      })
    };
  } catch (error: any) {
    console.error('Reprocess error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
