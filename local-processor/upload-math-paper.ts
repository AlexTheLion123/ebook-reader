/**
 * Upload a math past paper to QuickBook
 * 
 * Usage:
 *   npx tsx upload-math-paper.ts <paper-folder> --title "Math P1 Nov 2024"
 * 
 * Expected structure:
 *   <paper-folder>/
 *   ├── <paper-name>.html (with answers, for student viewing)
 *   ├── <paper-name>.md (questions only, for Knowledge Base)
 *   └── <memo-name>.md (memo, for Knowledge Base)
 */

import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const AWS_REGION = 'eu-west-1';
const S3_BUCKET = 'textbook-study-buddy-textbookbucket-hevgehlro2tk';
const DYNAMODB_TABLE = 'textbook-study-buddy-TextbookContentTable-PD2FT7ZOQ572';

const s3 = new S3Client({ region: AWS_REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION }));

async function uploadMathPaper(paperFolder: string, title: string) {
  const paperId = uuidv4();
  
  console.log(`\nUploading math paper: ${title}`);
  console.log(`  Paper ID: ${paperId}`);
  
  // Find files
  const files = fs.readdirSync(paperFolder);
  const htmlFile = files.find(f => f.endsWith('-with-answers.html'));
  const questionsFile = files.find(f => f.endsWith('.md') && !f.includes('MG'));
  const memoFile = files.find(f => f.endsWith('MG.md'));
  
  if (!htmlFile) throw new Error('HTML file not found (expected *-with-answers.html)');
  if (!questionsFile) throw new Error('Questions markdown not found');
  
  // Upload HTML to S3 (for student viewing)
  const htmlContent = fs.readFileSync(path.join(paperFolder, htmlFile), 'utf-8');
  const htmlS3Key = `math-papers/${paperId}/paper.html`;
  
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: htmlS3Key,
    Body: htmlContent,
    ContentType: 'text/html'
  }));
  console.log(`  ✓ Uploaded HTML: ${htmlS3Key}`);
  
  // Upload questions markdown to Knowledge Base folder
  const questionsContent = fs.readFileSync(path.join(paperFolder, questionsFile), 'utf-8');
  const questionsS3Key = `knowledge-base/${paperId}/questions.md`;
  
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: questionsS3Key,
    Body: questionsContent,
    ContentType: 'text/markdown'
  }));
  console.log(`  ✓ Uploaded questions to KB: ${questionsS3Key}`);
  
  // Upload memo if exists
  if (memoFile) {
    const memoContent = fs.readFileSync(path.join(paperFolder, memoFile), 'utf-8');
    const memoS3Key = `knowledge-base/${paperId}/memo.md`;
    
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: memoS3Key,
      Body: memoContent,
      ContentType: 'text/markdown'
    }));
    console.log(`  ✓ Uploaded memo to KB: ${memoS3Key}`);
  }
  
  // Create DynamoDB record
  await ddb.send(new PutCommand({
    TableName: DYNAMODB_TABLE,
    Item: {
      PK: `paper#${paperId}`,
      SK: 'metadata',
      type: 'math-paper',
      paperId,
      title,
      htmlS3Key,
      questionsS3Key,
      memoS3Key: memoFile ? `knowledge-base/${paperId}/memo.md` : undefined,
      createdAt: Date.now(),
      hidden: false
    }
  }));
  
  console.log(`\n✓ Math paper uploaded!`);
  console.log(`  Paper ID: ${paperId}`);
  console.log(`  Next: Sync Knowledge Base to index the markdown files`);
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx tsx upload-math-paper.ts <paper-folder> --title "Title"');
  process.exit(1);
}

const paperFolder = path.resolve(args[0]);
const titleIdx = args.indexOf('--title');
const title = titleIdx !== -1 ? args[titleIdx + 1] : 'Math Paper';

uploadMathPaper(paperFolder, title).catch(console.error);
