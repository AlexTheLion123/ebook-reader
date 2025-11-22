# PDF Content Processing Fix

## Problem Identified

The admin panel upload was **NOT** storing the actual PDF content - only metadata. Here's what was happening:

### Before (Broken Flow):
1. Admin uploads PDF → Gets presigned S3 URL
2. PDF uploaded to S3 bucket
3. **Only metadata stored in DynamoDB** (title, author, description, s3Key)
4. Frontend tries to read chapter content → **No content found** (empty response)

### Root Cause:
- The `upload.ts` handler only stored book metadata
- No PDF text extraction was happening
- No chapter content was being stored in DynamoDB
- The `/content/{bookId}` endpoint queries for `chapter#X#paragraph#Y` records that never existed

## Solution Implemented

Added automatic PDF processing using S3 event triggers:

### New Flow:
1. Admin uploads PDF → Gets presigned S3 URL
2. PDF uploaded to S3 bucket
3. **S3 triggers ProcessPdfFunction Lambda**
4. Lambda downloads PDF, extracts text using `pdf-parse`
5. Splits content into chapters (detects "Chapter X" patterns)
6. Stores each chapter's paragraphs in DynamoDB
7. Frontend can now successfully retrieve content

### Files Added/Modified:

1. **`backend/src/handlers/processPdf.ts`** (NEW)
   - Triggered automatically when PDF uploaded to S3
   - Extracts text from PDF using pdf-parse library
   - Detects chapters using regex pattern
   - Stores content in DynamoDB with proper structure:
     - PK: `book#{bookId}`
     - SK: `chapter#{chapterNum}#paragraph#{paragraphNum}`

2. **`backend/template.yaml`** (MODIFIED)
   - Added `ProcessPdfFunction` Lambda
   - Configured S3 event trigger for `.pdf` files
   - Increased timeout to 300s and memory to 1024MB for PDF processing

## Deployment

To deploy the fix:

```bash
cd backend
sam build
sam deploy
```

## Testing

1. Upload a new PDF through the admin panel
2. Check CloudWatch logs for ProcessPdfFunction to verify processing
3. Open the book in the frontend - content should now display

## Chapter Detection Logic

The PDF processor looks for patterns like:
- "Chapter 1: Introduction"
- "Chapter 2 - Getting Started"
- "CHAPTER 3: Advanced Topics"

If no chapters are detected, the entire PDF is stored as a single chapter.

## Reprocessing Existing PDFs

For PDFs uploaded before this fix, you have two options:

### Option 1: Re-upload through admin panel
Simply upload the PDF again - it will be automatically processed.

### Option 2: Use the reprocess endpoint
Call the `/reprocess` endpoint with the bookId:

```bash
curl -X POST https://YOUR_API_URL/prod/reprocess \
  -H "Content-Type: application/json" \
  -d '{"bookId": "your-book-id-here"}'
```

Response:
```json
{
  "success": true,
  "bookId": "your-book-id",
  "chaptersProcessed": 12,
  "paragraphsProcessed": 245,
  "message": "PDF reprocessed successfully"
}
```

## Notes

- Processing happens asynchronously (may take 10-30 seconds for large PDFs)
- The admin panel shows "success" after S3 upload, but content processing happens in background
- Check CloudWatch logs if content doesn't appear after 1-2 minutes
