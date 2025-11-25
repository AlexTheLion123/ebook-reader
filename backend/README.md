# QuickBook Backend

Serverless backend for QuickBook - an intelligent textbook reader with AI tutoring.

## Supported Formats

- ✅ **EPUB** - Digital textbooks
- ✅ **TeX/LaTeX** - Mathematics textbooks (NEW!)

## Architecture

- **API Gateway** → Lambda handlers
- **S3** → EPUB/TeX storage + chapter HTML
- **DynamoDB** → Book metadata, chapters, cached AI responses
- **Bedrock** → Claude 3 Haiku for AI features
- **LaTeXML** → TeX to HTML5+MathML conversion

## Quick Start

```bash
# Install dependencies
npm install

# Build everything (includes LaTeXML layer)
sam build

# Deploy
sam deploy --guided
```

**First time?** See [QUICK_START.md](QUICK_START.md) for a guided walkthrough.

**TeX Support:** See [TEX_SUPPORT.md](TEX_SUPPORT.md) for LaTeX textbook details.

## API Endpoints

### Content Management
- `POST /upload` - Get presigned URL for EPUB/TeX upload
- `GET /books` - List all books
- `GET /books/{bookId}/status` - Check processing status
- `GET /content/{bookId}?chapter=1` - Retrieve chapter content
- `PATCH /books/{bookId}/hide` - Soft-delete book
- `POST /books/{bookId}/reprocess` - Retry failed processing

### AI Features
- `POST /ask` - Ask questions about book/chapter
- `POST /summarize` - Generate chapter summary
- `POST /quiz/generate` - Generate quiz questions
- `POST /quiz/evaluate` - Evaluate student answers
- `POST /hint` - Get progressive hints

### Admin
- `GET /inspect/{bookId}` - Inspect book structure

## Data Model

### TextbookContentTable
- **Book Metadata:** `PK: book#{bookId}`, `SK: metadata`
- **Chapters:** `PK: book#{bookId}`, `SK: chapter#{number}`
- **Cached AI:** `PK: book#{bookId}`, `SK: summary#{number}` or `quiz#{number}`

### UserProgressTable
- **User Progress:** `PK: user#{userId}`, `SK: book#{bookId}`
- **Test Sessions:** `PK: user#{userId}`, `SK: test-session#{sessionId}`

## Storage Strategy

### S3 (Display)
- `books/{bookId}/chapters/{chapterId}.html` - HTML5 + MathML
- Served via presigned URLs
- Rendered by MathJax in frontend

### DynamoDB (AI Context)
- `textContent` field - Plain text with LaTeX notation
- Example: `"The derivative is $f'(x) = 2x$"`
- Sent to Bedrock for summaries, Q&A, quizzes

## Key Features

- 📚 **Dual Format Support** - EPUB and TeX/LaTeX
- 🧮 **Math Rendering** - MathML + MathJax for beautiful equations
- 🤖 **AI Tutoring** - Summaries, Q&A, quizzes, hints
- 💾 **Smart Caching** - Reduces AI costs by 80-90%
- 🔒 **Secure** - Presigned URLs, no public access
- 💰 **Cost-Optimized** - LaTeX notation for AI (fewer tokens)

## Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get started in 5 minutes
- **[TEX_SUPPORT.md](TEX_SUPPORT.md)** - Complete TeX/LaTeX guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment instructions
- **[TEX_IMPLEMENTATION_SUMMARY.md](TEX_IMPLEMENTATION_SUMMARY.md)** - Technical details

## Testing

Test with the included sample:
```bash
# Upload test-textbook.tex via admin interface
# or use curl (see QUICK_START.md)
```

## Cost Estimates

- **Processing:** ~$0.001-0.004 per book
- **Storage:** ~$0.01 per book
- **AI Operations:** ~$0.001-0.005 per request
- **Monthly (100 books, 1000 students):** ~$50-105

## Troubleshooting

View logs:
```bash
# EPUB processing
aws logs tail /aws/lambda/textbook-study-buddy-ProcessEpubFunction --follow

# TeX processing
aws logs tail /aws/lambda/textbook-study-buddy-ProcessTexFunction --follow
```

## Next Phase

**Phase 2: Adaptive Testing** (In Progress)
- Multi-turn conversations per question
- Progressive hints and follow-up questions
- Understanding level assessment
- Progress tracking

**Phase 3: RAG for Book-Wide Testing**
- Vector embeddings (Titan)
- Semantic search (OpenSearch)
- Cross-chapter questions

**Phase 4: Bedrock Agents**
- Intelligent orchestration
- Proactive tutoring
- Personalized study plans
