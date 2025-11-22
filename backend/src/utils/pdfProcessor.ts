import { TextractClient, StartDocumentAnalysisCommand, GetDocumentAnalysisCommand, Block } from '@aws-sdk/client-textract';
import { putItem, updateItem } from './dynamodb';

const textract = new TextractClient({});

interface ProcessPdfResult {
  chaptersProcessed: number;
  paragraphsProcessed: number;
}

export async function processPdfAndStore(
  bucket: string,
  s3Key: string,
  bookId: string,
  tableName: string
): Promise<ProcessPdfResult> {
  try {
    // Update status to processing
    await updateItem(
      tableName,
      { PK: `book#${bookId}`, SK: 'metadata' },
      'SET processingStatus = :status, processingStartedAt = :time',
      { ':status': 'processing', ':time': Date.now() }
    );

    // Start Textract analysis
    const startCommand = new StartDocumentAnalysisCommand({
      DocumentLocation: { S3Object: { Bucket: bucket, Name: s3Key } },
      FeatureTypes: ['LAYOUT']
    });
  
  const { JobId } = await textract.send(startCommand);
  
  // Poll for completion with timeout protection
  let blocks: Block[] = [];
  let status = 'IN_PROGRESS';
  const maxAttempts = 180; // 15 minutes max (180 * 5 seconds)
  let attempts = 0;
  
  while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
    
    const getCommand = new GetDocumentAnalysisCommand({ JobId });
    const response = await textract.send(getCommand);
    status = response.JobStatus!;
    
    if (status === 'SUCCEEDED') {
      blocks = response.Blocks || [];
      let nextToken = response.NextToken;
      
      while (nextToken) {
        const nextResponse = await textract.send(new GetDocumentAnalysisCommand({ JobId, NextToken: nextToken }));
        blocks.push(...(nextResponse.Blocks || []));
        nextToken = nextResponse.NextToken;
      }
    }
  }
  
  if (status !== 'SUCCEEDED') {
    throw new Error(`Textract job failed or timed out. Status: ${status}`);
  }
  
  // Extract structured content by page
  const lines = blocks.filter(b => b.BlockType === 'LINE');
  const pageMap = new Map<number, string>();
  
  // Group lines by page
  for (const line of lines) {
    const pageNum = line.Page || 1;
    const text = line.Text || '';
    const existing = pageMap.get(pageNum) || '';
    pageMap.set(pageNum, existing + text + '\n');
  }
  
  // Store each page as a paragraph
  let paragraphsProcessed = 0;
  for (const [pageNum, content] of Array.from(pageMap.entries()).sort((a, b) => a[0] - b[0])) {
    await putItem(tableName, {
      PK: `book#${bookId}`,
      SK: `chapter#1#paragraph#${pageNum}`,
      type: 'content',
      chapterNumber: 1,
      paragraphNumber: pageNum,
      pageNumber: pageNum,
      paragraphText: content.trim()
    });
    paragraphsProcessed++;
  }
  
    // Update status to success
    await updateItem(
      tableName,
      { PK: `book#${bookId}`, SK: 'metadata' },
      'SET processingStatus = :status, processingCompletedAt = :time, chaptersProcessed = :cp, paragraphsProcessed = :pp',
      {
        ':status': 'success',
        ':time': Date.now(),
        ':cp': 1,
        ':pp': paragraphsProcessed
      }
    );

    return { chaptersProcessed: 1, paragraphsProcessed };
  } catch (error: any) {
    // Update status to failed
    await putItem(tableName, {
      PK: `book#${bookId}`,
      SK: 'metadata',
      processingStatus: 'failed',
      processingError: error.message,
      processingFailedAt: Date.now()
    });
    throw error;
  }
}
