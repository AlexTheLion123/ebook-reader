import { APIGatewayProxyHandler } from 'aws-lambda';
import { getUploadUrl } from '../utils/s3';
import { putItem } from '../utils/dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { bookId, fileName, title, author, description, subject } = JSON.parse(event.body || '{}');
    
    if (!bookId || !fileName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'bookId and fileName required' }) };
    }

    // Detect file format
    const isTexFile = /\.(tex|latex)$/i.test(fileName);
    const isEpubFile = /\.epub$/i.test(fileName);
    
    if (!isTexFile && !isEpubFile) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Only .epub, .tex, and .latex files are supported' }) 
      };
    }

    const sourceFormat = isTexFile ? 'tex' : 'epub';
    const bucket = process.env.BOOKS_BUCKET!;
    const key = `${bookId}/${fileName}`;
    const uploadUrl = await getUploadUrl(bucket, key);

    // Store metadata
    await putItem(process.env.CONTENT_TABLE!, {
      PK: `book#${bookId}`,
      SK: 'metadata',
      type: 'book',
      fileName,
      sourceFormat,
      title: title || fileName.replace(/\.(epub|tex|latex)$/i, ''),
      author: author || 'Unknown Author',
      description: description || `Uploaded ${sourceFormat.toUpperCase()} Textbook`,
      subject: subject || '',
      s3Key: key,
      uploadedAt: Date.now(),
      processingStatus: 'pending'
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ uploadUrl, bookId, key, sourceFormat })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Upload failed' }) };
  }
};
