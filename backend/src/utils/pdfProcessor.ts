import { TextractClient, StartDocumentAnalysisCommand, GetDocumentAnalysisCommand, Block } from '@aws-sdk/client-textract';
import { putItem } from './dynamodb';

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
  
  // Extract structured content
  const lines = blocks.filter(b => b.BlockType === 'LINE');
  let currentChapter = 1;
  let paragraphNum = 1;
  let chaptersProcessed = 0;
  let paragraphsProcessed = 0;
  let buffer = '';
  
  for (const line of lines) {
    const text = line.Text || '';
    const chapterMatch = text.match(/^Chapter\s+(\d+)/i);
    
    if (chapterMatch) {
      // Store previous paragraph
      if (buffer.trim()) {
        await putItem(tableName, {
          PK: `book#${bookId}`,
          SK: `chapter#${currentChapter}#paragraph#${paragraphNum}`,
          type: 'content',
          chapterNumber: currentChapter,
          paragraphNumber: paragraphNum,
          paragraphText: buffer.trim()
        });
        paragraphsProcessed++;
      }
      
      currentChapter = parseInt(chapterMatch[1]);
      paragraphNum = 1;
      buffer = text + '\n';
      chaptersProcessed++;
    } else {
      buffer += text + '\n';
      
      // Store paragraph every ~500 chars
      if (buffer.length > 500) {
        await putItem(tableName, {
          PK: `book#${bookId}`,
          SK: `chapter#${currentChapter}#paragraph#${paragraphNum}`,
          type: 'content',
          chapterNumber: currentChapter,
          paragraphNumber: paragraphNum,
          paragraphText: buffer.trim()
        });
        paragraphsProcessed++;
        paragraphNum++;
        buffer = '';
      }
    }
  }
  
  // Store final paragraph
  if (buffer.trim()) {
    await putItem(tableName, {
      PK: `book#${bookId}`,
      SK: `chapter#${currentChapter}#paragraph#${paragraphNum}`,
      type: 'content',
      chapterNumber: currentChapter,
      paragraphNumber: paragraphNum,
      paragraphText: buffer.trim()
    });
    paragraphsProcessed++;
  }
  
  return { chaptersProcessed: chaptersProcessed || 1, paragraphsProcessed };
}
