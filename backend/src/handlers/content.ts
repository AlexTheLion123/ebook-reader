import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryItems, getItem } from '../utils/dynamodb';
import { getObject, getPresignedUrl } from '../utils/s3';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const bookId = event.pathParameters?.bookId;
    const chapter = event.queryStringParameters?.chapter;

    if (!bookId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'bookId required' }) };
    }

    const pk = `book#${bookId}`;
    let items = [];

    if (chapter) {
      // Fetch specific chapter
      const item = await getItem(process.env.CONTENT_TABLE!, { PK: pk, SK: `chapter#${chapter}` });
      if (item) {
        if (item.s3Key) {
          try {
            const contentBuffer = await getObject(process.env.BOOKS_BUCKET!, item.s3Key);
            let content = contentBuffer.toString('utf-8');
            
            // Replace S3 image URLs with presigned URLs
            const bucket = process.env.BOOKS_BUCKET!;
            const imageRegex = new RegExp(`https://${bucket}\.s3\.[^/]+\.amazonaws\.com/(books/${bookId}/images/[^"'\s]+)`, 'g');
            const matches = [...content.matchAll(imageRegex)];
            
            for (const match of matches) {
              const imageKey = match[1];
              const presignedUrl = await getPresignedUrl(bucket, imageKey, 3600);
              content = content.replace(match[0], presignedUrl);
            }
            
            item.content = content;
          } catch (e) {
            console.error(`Failed to fetch content from S3 for ${item.s3Key}`, e);
            item.content = 'Error loading content';
          }
        }
        items.push(item);
      }
    } else {
      // Fetch all chapters (metadata only ideally, but here we get everything)
      // Note: This might be heavy if content is included. 
      // For listing chapters, we might want a different query or GSI, but for now:
      items = await queryItems(process.env.CONTENT_TABLE!, pk, 'chapter#');
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ bookId, items })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch content' }) };
  }
};
