# Textbook Study Buddy - MVP Backend

Simplified serverless backend using AWS SAM, Lambda, DynamoDB, S3, and Bedrock.

## Architecture

- **API Gateway** → Lambda handlers
- **S3** → PDF storage
- **DynamoDB** → Content & user progress
- **Bedrock** → Claude 3 Haiku for RAG

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build TypeScript:
```bash
npm run build
```

3. Deploy:
```bash
sam build
sam deploy --guided
```

## Endpoints

- `POST /upload` - Get presigned URL for PDF upload
- `GET /content/{bookId}?chapter=1` - Retrieve content
- `POST /ask` - Ask questions (RAG)
- `POST /summarize` - Generate summaries

## Data Model

### TextbookContent Table
- PK: `book#{bookId}`
- SK: `chapter#{chapterNumber}#para#{paraIndex}`

### UserProgress Table
- PK: `user#{userId}`
- SK: `book#{bookId}#session#{sessionId}`

## Next Steps (Phase 2)

1. Add PDF extraction worker (Lambda + SQS)
2. Implement embeddings (Titan) + vector search
3. Add quiz generation endpoint
4. Implement answer evaluation
