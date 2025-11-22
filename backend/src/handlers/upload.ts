import { APIGatewayProxyHandler } from 'aws-lambda';
import { getUploadUrl } from '../utils/s3';
import { putItem } from '../utils/dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { bookId, fileName, title, author, description, subject } = JSON.parse(event.body || '{}');
    
    if (!bookId || !fileName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'bookId and fileName required' }) };
    }

    const bucket = process.env.PDF_BUCKET!;
    const key = `${bookId}/${fileName}`;
    const uploadUrl = await getUploadUrl(bucket, key);

    // Store metadata
    await putItem(process.env.CONTENT_TABLE!, {
      PK: `book#${bookId}`,
      SK: 'metadata',
      type: 'book',
      fileName,
      title: title || fileName.replace(/\.pdf$/i, ''),
      author: author || 'Unknown Author',
      description: description || 'Uploaded PDF Textbook',
      subject: subject || '',
      s3Key: key,
      uploadedAt: Date.now()
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ uploadUrl, bookId, key })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Upload failed' }) };
  }
};
