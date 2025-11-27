/**
 * Upload a pre-converted TeX book to QuickBook AWS
 * 
 * This tool uploads HTML chapters and creates DynamoDB records for books
 * that have already been converted from TeX to HTML (manually in sandbox).
 * 
 * Usage:
 *   npx tsx upload-book.ts <book-folder> --title "Book Title" --author "Author Name"
 *   npx tsx upload-book.ts <single-file.html> --title "Book Title" --author "Author Name"
 * 
 * Expected folder structure:
 *   <book-folder>/
 *   ├── chapters/
 *   │   ├── chapter-1.html
 *   │   ├── chapter-1.tex (optional, for AI context)
 *   │   ├── chapter-2.html
 *   │   └── ...
 *   ├── images/ (optional)
 *   │   ├── image1.png
 *   │   └── ...
 *   └── manifest.json (optional - can auto-generate)
 * 
 * Or for a single HTML file (will be treated as one chapter):
 *   npx tsx upload-book.ts book.html --title "Book Title" --author "Author Name"
 * 
 * Environment variables:
 *   AWS_REGION - AWS region (default: eu-west-1)
 *   S3_BUCKET - S3 bucket name (default: textbook-study-buddy-textbookbucket-hevgehlro2tk)
 *   DYNAMODB_TABLE - DynamoDB table name (default: textbook-study-buddy-TextbookContentTable-PD2FT7ZOQ572)
 *   DRY_RUN - Set to 'true' to preview without uploading
 */

import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const S3_BUCKET = process.env.S3_BUCKET || 'textbook-study-buddy-textbookbucket-hevgehlro2tk';
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || 'textbook-study-buddy-TextbookContentTable-PD2FT7ZOQ572';
const DRY_RUN = process.env.DRY_RUN === 'true';

// AWS Clients
const s3Client = new S3Client({ region: AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface ChapterInfo {
  number: number;
  title: string;
  htmlFile: string;
  texFile?: string;
}

interface BookManifest {
  title: string;
  author: string;
  sourceFormat: string;
  chapters: ChapterInfo[];
}

interface UploadStats {
  chaptersUploaded: number;
  imagesUploaded: number;
  totalSize: number;
  errors: string[];
}

/**
 * Verify AWS credentials and bucket access
 */
async function verifyAwsAccess(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    console.log('✓ AWS credentials verified, bucket accessible');
  } catch (error: unknown) {
    const err = error as Error & { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      throw new Error(`S3 bucket '${S3_BUCKET}' not found. Check your bucket name or region.`);
    } else if (err.name === 'AccessDenied' || err.$metadata?.httpStatusCode === 403) {
      throw new Error(`Access denied to S3 bucket '${S3_BUCKET}'. Check your AWS credentials and permissions.`);
    } else if (err.name === 'CredentialsProviderError' || err.message?.includes('credentials')) {
      throw new Error('AWS credentials not configured. Run "aws configure" or set environment variables.');
    }
    throw new Error(`Failed to verify AWS access: ${err.message}`);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { inputPath: string; title: string; author: string } {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npx tsx upload-book.ts <book-folder-or-html-file> --title "Title" --author "Author"

Examples:
  npx tsx upload-book.ts ../sandbox/calculus-chapters --title "Calculus Made Easy" --author "Silvanus P. Thompson"
  npx tsx upload-book.ts ../sandbox/output.html --title "Calculus Made Easy" --author "Silvanus P. Thompson"
`);
    process.exit(0);
  }

  const inputPath = args[0];
  let title = 'Untitled';
  let author = 'Unknown';

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      title = args[++i];
    } else if (args[i] === '--author' && args[i + 1]) {
      author = args[++i];
    }
  }

  return { inputPath, title, author };
}

/**
 * Extract chapter title from HTML content
 */
function extractChapterTitle(html: string, defaultTitle: string): string {
  // Try to find h1 or h2 title
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();
  
  const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  if (h2Match) return h2Match[1].trim();
  
  // Try LaTeXML chapter title
  const ltxMatch = html.match(/class="ltx_title[^"]*"[^>]*>([^<]+)</i);
  if (ltxMatch) return ltxMatch[1].trim();
  
  return defaultTitle;
}

/**
 * Upload a file to S3 with retry logic
 */
async function uploadToS3(key: string, body: Buffer | string, contentType: string, retries = 3): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would upload to S3: ${key}`);
    return;
  }

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }));
      console.log(`  ✓ S3: ${key}`);
      return;
    } catch (error: unknown) {
      lastError = error as Error;
      if (attempt < retries) {
        console.log(`  ⚠ S3 upload attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw new Error(`Failed to upload ${key} after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Create a DynamoDB record with retry logic
 */
async function putDynamoItem(item: Record<string, unknown>, retries = 3): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create DynamoDB record: ${item.PK}/${item.SK}`);
    return;
  }

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await docClient.send(new PutCommand({
        TableName: DYNAMODB_TABLE,
        Item: item,
      }));
      return;
    } catch (error: unknown) {
      lastError = error as Error;
      if (attempt < retries) {
        console.log(`  ⚠ DynamoDB put attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw new Error(`Failed to create DynamoDB record after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Upload a book from a folder with chapters
 */
async function uploadBookFolder(folderPath: string, title: string, author: string): Promise<void> {
  const bookId = uuidv4();
  const chaptersDir = path.join(folderPath, 'chapters');
  const imagesDir = path.join(folderPath, 'images');
  
  console.log(`\nUploading book: ${title}`);
  console.log(`  Book ID: ${bookId}`);
  console.log(`  Author: ${author}`);
  
  // Find chapter files
  if (!fs.existsSync(chaptersDir)) {
    throw new Error(`Chapters directory not found: ${chaptersDir}`);
  }
  
  const files = fs.readdirSync(chaptersDir);
  const htmlFiles = files.filter(f => f.endsWith('.html')).sort();
  
  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files found in ${chaptersDir}`);
  }
  
  console.log(`  Found ${htmlFiles.length} chapters`);
  
  // Upload chapters
  const chapters: ChapterInfo[] = [];
  
  for (let i = 0; i < htmlFiles.length; i++) {
    const htmlFile = htmlFiles[i];
    const chapterNum = i + 1;
    const htmlPath = path.join(chaptersDir, htmlFile);
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    
    // Check for corresponding .tex file
    const texFile = htmlFile.replace('.html', '.tex');
    const texPath = path.join(chaptersDir, texFile);
    let latexContent = '';
    if (fs.existsSync(texPath)) {
      latexContent = fs.readFileSync(texPath, 'utf-8');
    }
    
    // Extract chapter title
    const chapterTitle = extractChapterTitle(htmlContent, `Chapter ${chapterNum}`);
    
    // Upload HTML to S3
    const s3Key = `books/${bookId}/chapters/chapter-${chapterNum}.html`;
    await uploadToS3(s3Key, htmlContent, 'text/html');
    
    // Create chapter record in DynamoDB
    const chapterRecord: Record<string, unknown> = {
      PK: `book#${bookId}`,
      SK: `chapter#${chapterNum}`,
      type: 'content',
      chapterId: `chapter-${chapterNum}`,
      title: chapterTitle,
      order: chapterNum,
      s3Key: s3Key,
    };
    
    // Add LaTeX content for AI context (truncate if too long)
    if (latexContent) {
      chapterRecord.latexContent = latexContent.substring(0, 50000);
    }
    
    await putDynamoItem(chapterRecord);
    console.log(`  ✓ Chapter ${chapterNum}: ${chapterTitle}`);
    
    chapters.push({
      number: chapterNum,
      title: chapterTitle,
      htmlFile: s3Key,
      texFile: latexContent ? texFile : undefined,
    });
  }
  
  // Upload images if they exist
  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir);
    for (const imgFile of imageFiles) {
      const imgPath = path.join(imagesDir, imgFile);
      const imgContent = fs.readFileSync(imgPath);
      const ext = path.extname(imgFile).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 
                          ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                          ext === '.gif' ? 'image/gif' : 
                          ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';
      
      const s3Key = `books/${bookId}/images/${imgFile}`;
      await uploadToS3(s3Key, imgContent, contentType);
    }
    console.log(`  ✓ Uploaded ${imageFiles.length} images`);
  }
  
  // Create book metadata record
  const bookMetadata = {
    PK: `book#${bookId}`,
    SK: 'metadata',
    type: 'book',
    title: title,
    author: author,
    sourceFormat: 'tex',
    processingStatus: 'success',
    chaptersProcessed: chapters.length,
    createdAt: Date.now(),
    hidden: false,
  };
  
  await putDynamoItem(bookMetadata);
  console.log(`\n✓ Book uploaded successfully!`);
  console.log(`  Book ID: ${bookId}`);
  console.log(`  Chapters: ${chapters.length}`);
}

/**
 * Upload a single HTML file as a one-chapter book
 */
async function uploadSingleHtml(htmlPath: string, title: string, author: string): Promise<void> {
  const bookId = uuidv4();
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  
  console.log(`\nUploading single-chapter book: ${title}`);
  console.log(`  Book ID: ${bookId}`);
  console.log(`  Author: ${author}`);
  
  // Upload HTML to S3
  const s3Key = `books/${bookId}/chapters/chapter-1.html`;
  await uploadToS3(s3Key, htmlContent, 'text/html');
  
  // Create chapter record
  const chapterTitle = extractChapterTitle(htmlContent, title);
  await putDynamoItem({
    PK: `book#${bookId}`,
    SK: 'chapter#1',
    type: 'content',
    chapterId: 'chapter-1',
    title: chapterTitle,
    order: 1,
    s3Key: s3Key,
  });
  
  // Create book metadata
  await putDynamoItem({
    PK: `book#${bookId}`,
    SK: 'metadata',
    type: 'book',
    title: title,
    author: author,
    sourceFormat: 'tex',
    processingStatus: 'success',
    chaptersProcessed: 1,
    createdAt: Date.now(),
    hidden: false,
  });
  
  console.log(`\n✓ Book uploaded successfully!`);
  console.log(`  Book ID: ${bookId}`);
}

/**
 * Detect input type and validate
 */
function detectInputType(fullPath: string): 'directory' | 'html' | 'unknown' {
  const stats = fs.statSync(fullPath);
  
  if (stats.isDirectory()) {
    // Check if it has chapters/ directory or HTML files directly
    const chaptersDir = path.join(fullPath, 'chapters');
    if (fs.existsSync(chaptersDir) && fs.statSync(chaptersDir).isDirectory()) {
      return 'directory';
    }
    // Check if directory contains HTML files directly
    const files = fs.readdirSync(fullPath);
    if (files.some((f: string) => f.endsWith('.html'))) {
      console.log('Note: Found HTML files in root directory. Consider organizing into chapters/ subfolder.');
      return 'directory';
    }
    return 'unknown';
  } else if (stats.isFile() && fullPath.endsWith('.html')) {
    return 'html';
  }
  
  return 'unknown';
}

async function main(): Promise<void> {
  console.log('=== QuickBook TeX Uploader ===');
  console.log(`Region: ${AWS_REGION}`);
  console.log(`S3 Bucket: ${S3_BUCKET}`);
  console.log(`DynamoDB Table: ${DYNAMODB_TABLE}`);
  
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No actual uploads will occur\n');
  }
  
  const { inputPath, title, author } = parseArgs();
  const fullPath = path.resolve(inputPath);
  
  // Validate input exists
  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ Error: Path not found: ${fullPath}`);
    console.error('Make sure the file or directory exists and the path is correct.');
    process.exit(1);
  }
  
  // Verify AWS access before starting
  console.log('\nVerifying AWS access...');
  await verifyAwsAccess();
  
  // Detect input type
  const inputType = detectInputType(fullPath);
  
  switch (inputType) {
    case 'directory':
      // Check for chapters subdirectory
      const chaptersDir = path.join(fullPath, 'chapters');
      if (fs.existsSync(chaptersDir)) {
        await uploadBookFolder(fullPath, title, author);
      } else {
        // HTML files in root - create virtual chapters structure
        console.log('\nConverting flat HTML structure to chapters...');
        const tempChaptersDir = path.join(fullPath, 'chapters');
        fs.mkdirSync(tempChaptersDir, { recursive: true });
        
        const htmlFiles = fs.readdirSync(fullPath).filter((f: string) => f.endsWith('.html'));
        for (const htmlFile of htmlFiles) {
          fs.renameSync(path.join(fullPath, htmlFile), path.join(tempChaptersDir, htmlFile));
        }
        
        try {
          await uploadBookFolder(fullPath, title, author);
        } finally {
          // Move files back
          for (const htmlFile of htmlFiles) {
            if (fs.existsSync(path.join(tempChaptersDir, htmlFile))) {
              fs.renameSync(path.join(tempChaptersDir, htmlFile), path.join(fullPath, htmlFile));
            }
          }
          fs.rmdirSync(tempChaptersDir);
        }
      }
      break;
      
    case 'html':
      await uploadSingleHtml(fullPath, title, author);
      break;
      
    default:
      console.error('\n❌ Error: Input must be one of:');
      console.error('  - A folder with chapters/ subdirectory containing .html files');
      console.error('  - A folder containing .html files directly');
      console.error('  - A single .html file');
      process.exit(1);
  }
  
  console.log('\n📚 Upload complete! The book is now available in QuickBook.');
  console.log('You can view it at: https://d36lrbq2dbbmzz.cloudfront.net/');
}

main().catch((error: Error & { code?: string }) => {
  console.error('\n❌ Upload failed:', error.message);
  
  // Provide helpful error messages
  if (error.code === 'ENOENT') {
    console.error('File or directory not found. Check the path and try again.');
  } else if (error.message.includes('credentials')) {
    console.error('\nAWS credentials not found. Please run:');
    console.error('  aws configure');
    console.error('Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  } else if (error.message.includes('Access Denied')) {
    console.error('\nPermission denied. Check your AWS IAM permissions for S3 and DynamoDB.');
  }
  
  process.exit(1);
});
