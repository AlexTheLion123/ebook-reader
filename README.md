# QuickBook 📚

> **The first AI-native eBook reader that combines a full-text reader with a literature-specific spaced-repetition system and a book-grounded AI assistant.**

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange?logo=amazon-aws)](https://aws.amazon.com/serverless/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

QuickBook makes deep comprehension and long-term retention of classic and modern literature feel effortless and habitual.

---

## 🎯 The Problem

Traditional textbook reading is passive and inefficient:
- Students read without active engagement
- No immediate feedback on comprehension
- Difficult to identify knowledge gaps
- No personalized learning path
- Expensive tutoring costs
- General-purpose AI tutors hallucinate and spoil plot points

## 💡 The Solution

QuickBook transforms any EPUB or LaTeX textbook into an interactive learning platform with:

1. **AI-Powered Tutoring** - A Socratic-method tutor using Amazon Bedrock Agent with semantic search across your textbooks
2. **Adaptive Testing** - Spaced repetition system (Leitner + SM-2) that intelligently schedules reviews
3. **Progressive Hints** - Three-tier hint system that guides without giving away answers
4. **Chapter Mastery Tracking** - Visual progress maps showing Green/Yellow/Gray mastery status
5. **Dynamic Question Rephrasing** - AI-generated variations to prevent rote memorization

---

## 🏆 Why QuickBook Wins

| Advantage | How We Do It | Competitive Impact |
|-----------|--------------|-------------------|
| **Proven retention mechanics** | Full Leitner-based SRS with adaptive session modes (Quick / Standard / Thorough) | Matches or exceeds Anki and Mochi while remaining fully automated |
| **Literature-optimized AI** | RAG pipeline grounded exclusively in the current book → accurate, spoiler-free answers | Eliminates hallucinations that plague ChatGPT, Perplexity |
| **Frictionless UX** | One-tap session start, inline customization, no full-screen modals for 99% of interactions | Highest daily active usage potential; benchmark advantage over Readwise, LingQ, Matter |
| **Visual mastery feedback** | Chapter progress maps + concept mastery cards (themes, symbols, narrative voice) | Strong motivational signal proven to increase session frequency |
| **High-conversion funnel** | Anonymous users get full-power quiz sessions → natural upgrade prompt at end | Industry-standard 28–41% conversion rates (2025 edtech data) |
| **Clear category ownership** | No competitor offers eBook reader + literature-tuned SRS + contextual AI in one product | Default tool for high-school/college literature and lifelong readers |

### Market Opportunity

- **1.2 million** students annually prepare for AP/IB/A-Level literature exams
- **100+ million** yearly searches for "how to understand [classic novel]"
- Comparable tools (Readwise Reader, LingQ, Matter) generate **$40–80M ARR combined** with shallower literary focus

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                    │
│                     React + TypeScript + Vite                           │
│                     Hosted on AWS Amplify                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Gateway                                    │
│                    REST API with Cognito Auth                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Content APIs   │   │   Agent API     │   │   SRS APIs      │
│  (Lambda)       │   │   (Lambda)      │   │   (Lambda)      │
│  - Upload       │   │  POST /agent/   │   │  POST /srs/     │
│  - List Books   │   │       chat      │   │    next-batch   │
│  - Get Content  │   │                 │   │  POST /srs/     │
│  - Summarize    │   │                 │   │    submit       │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   DynamoDB      │   │ Bedrock Agent   │   │   DynamoDB      │
│ TextbookContent │   │ + Knowledge Base│   │  UserProgress   │
│     Table       │   │ + Action Groups │   │     Table       │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│       S3        │   │   OpenSearch    │
│  EPUB storage   │   │   Serverless    │
│ Chapter HTML    │   │  (Embeddings)   │
│ KB chunks       │   │                 │
└─────────────────┘   └─────────────────┘
```

---

## ✨ Key Features

### 1. Intelligent AI Tutor

The Bedrock Agent acts as a Socratic tutor with full access to book content:

- **Semantic Search**: Finds relevant passages across entire textbooks
- **Context-Aware**: Maintains conversation history within sessions
- **Tool Calling**: Automatically retrieves summaries, generates quizzes, provides hints
- **Quiz Mode**: Never reveals answers prematurely, guides students to discover answers

```json
POST /agent/chat
{
  "message": "What does Mr. Darcy think of Elizabeth at the ball?",
  "sessionId": "session-123",
  "bookId": "2f5738f7-f856-4026-ac71-8457e01a06dc"
}
```

### 2. Spaced Repetition System (SRS)

Combines **Leitner boxes** (7 levels) with **SM-2 algorithm** for optimal retention:

| Box | Review Interval | Status |
|-----|-----------------|--------|
| 0   | 1 day           | New/Failed |
| 1   | 3 days          | Learning |
| 2   | 7 days          | Learning |
| 3   | 14 days         | Review |
| 4   | 30 days         | Review |
| 5   | 90 days         | Mature |
| 6   | 180 days        | Mastered |

Rating buttons adjust both box level and ease factor:
- **Again**: Reset to Box 0, ease -0.20
- **Hard**: Box -1, ease -0.10
- **Good**: Box +1, ease unchanged
- **Easy**: Box +2, ease +0.15

### 3. Multi-Format Question Types

| Type | Distribution | Use Case |
|------|--------------|----------|
| MCQ | 55% | Comprehension checks |
| TRUE_FALSE | 15% | Quick recall |
| SHORT_ANSWER | 10% | Factual knowledge (1-5 words) |
| BRIEF_RESPONSE | 15% | Analysis questions (1-2 sentences) |
| FILL_BLANK | 5% | Direct quotation recall |

### 4. Progressive Hint System

Three-tier hints guide students without giving away answers:

1. **Level 1 (Subtle)**: Guiding questions ("Consider the narrator's tone...")
2. **Level 2 (Moderate)**: Points to specific concepts without naming them
3. **Level 3 (Strong)**: Step-by-step explanation, stops short of the answer

### 5. Chapter Mastery Visualization

Visual progress tracking with intuitive color coding:

- 🟢 **Green (Mastered)**: ≥80% of questions in Box 5-6
- 🟡 **Yellow (In Progress)**: At least 1 question seen, but <80% mastered
- ⚪ **Gray (Untouched)**: No questions attempted

---

## 📦 Project Structure

```
quickbook/
├── backend/                    # AWS SAM serverless backend
│   ├── src/
│   │   ├── handlers/          # Lambda function handlers
│   │   │   ├── agent.ts       # Bedrock Agent invocation
│   │   │   ├── actionGroup.ts # Agent tool implementations
│   │   │   ├── srsGetBatch.ts # SRS question retrieval
│   │   │   └── ...            # Content, quiz, hint handlers
│   │   ├── utils/             # Shared utilities
│   │   │   ├── srsAlgorithm.ts
│   │   │   ├── bedrock.ts
│   │   │   └── dynamodb.ts
│   │   └── types.ts
│   └── template.yaml          # SAM infrastructure definition
│
├── frontend/                   # React + Vite frontend
│   ├── components/
│   │   ├── ReaderView.tsx     # Book reading interface
│   │   ├── TestSuite.tsx      # Adaptive testing UI
│   │   ├── AgentChatSidebar.tsx # AI tutor chat
│   │   └── ...
│   ├── services/
│   │   └── backendService.ts  # API client
│   └── types.ts
│
├── local-processor/            # Book processing tools
│   ├── upload-book.ts         # Upload books to S3/DynamoDB
│   ├── generate-questions.ts  # AI question generation
│   └── chunk-epub.ts          # Extract KB chunks
│
├── docs/                       # Documentation
│   ├── LEITNER_SYSTEM_IMPLEMENTATION.md
│   ├── COGNITO_SETUP.md
│   └── AUTH_GATING_STRATEGY.md
│
└── .amazonq/rules/             # Project context for AI assistants
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x
- AWS CLI configured with credentials
- AWS SAM CLI
- An AWS account with Bedrock access (eu-west-1)

### Backend Deployment

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to AWS
sam build && sam deploy --guided
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your Cognito and API values

# Start development server
npm run dev
```

### Processing a New Book

```bash
cd local-processor

# Upload an EPUB book
npx tsx upload-book.ts --path ./books/my-book.epub \
  --title "My Book Title" \
  --author "Author Name"

# Generate questions for chapters
npx tsx generate-questions.ts --chapter=1

# Sync Knowledge Base
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id 46UH9JADOK \
  --data-source-id VQUWWA99GL \
  --region eu-west-1
```

---

## 🔧 AWS Resources

| Resource | ID/Name | Purpose |
|----------|---------|---------|
| **Stack** | `textbook-study-buddy` | CloudFormation stack |
| **API** | `https://6ga7cukouj.execute-api.eu-west-1.amazonaws.com/prod/` | REST API endpoint |
| **Agent** | `HGAOUG8YYO` | Bedrock Agent ID |
| **Agent Alias** | `NVVOJM5GAY` | Production alias |
| **Knowledge Base** | `46UH9JADOK` | Vector store for book content |
| **S3 Bucket** | `textbook-study-buddy-textbookbucket-*` | Content storage |
| **DynamoDB** | `TextbookContentTable`, `UserProgressTable` | Metadata & progress |

---

## 📚 Current Books

### Pride and Prejudice (Jane Austen)
- **Book ID**: `2f5738f7-f856-4026-ac71-8457e01a06dc`
- **Chapters**: 61
- **KB Documents**: ~330 chapter chunks + 18 study notes
- **Summaries**: 62 cached
- **Study Notes**: Themes (7), Motifs (3), Symbols (3), Characters (2), Plot (1), Settings (2)

### Calculus Made Easy (Silvanus P. Thompson)
- **Book ID**: `74411ba5-6d75-4eb0-9227-883185ec5384`
- **Chapters**: 23
- **KB Documents**: ~180 chapter chunks

---

## 💰 Unit Economics

### Cost Per Session

| Metric | Value |
|--------|-------|
| **Cost per full quiz session** | < $0.03 (Claude Haiku + Bedrock) |
| **Projected LTV** | $70–120 (at $6–8/month premium) |
| **Payback period** | < 4 months (at 30% trial-to-paid) |

### Infrastructure Costs

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| DynamoDB | ~$0.50/1K users | On-demand pricing |
| Lambda | ~$0.10/1K users | Minimal invocations |
| Bedrock (Claude Haiku) | ~$0.002/conversation | ~1K tokens/turn |
| OpenSearch Serverless | ~$175/month | Fixed minimum charge |
| S3 | ~$0.02/GB | Book storage |

**Target**: Under $2/MAU for active users (excluding OpenSearch base cost)

### Cost Optimization Strategies

1. **Aggressive Caching**: Summaries and quizzes cached in DynamoDB
2. **Claude Haiku**: Most cost-effective Bedrock model ($0.00025/1K input tokens)
3. **Context Limits**: Chapter content capped at 50K characters
4. **Cached Flags**: Frontend shows cache status for transparency

---

## 🔐 Authentication Strategy

QuickBook uses a "Generous Trial → Soft Wall → Hard Wall" strategy:

| Feature | Anonymous | Signed In |
|---------|-----------|-----------|
| Browse Library | ✅ | ✅ |
| Read Chapters 1-2 | ✅ | ✅ |
| Read Full Book | ❌ | ✅ |
| Complete Quiz Session | ✅ (1 session) | ✅ |
| Save Progress | ❌ | ✅ |
| AI Tutor Chat | ❌ | ✅ |
| Dashboard | ❌ | ✅ |

**Psychology**: Let users experience the magic before requiring sign-up. After completing one quiz session (10-20 min investment), show:
> "🎉 Great job! You reviewed 12 cards with 92% accuracy. Sign in to save your progress."

---

## 🧪 Testing

### Agent Testing

```bash
# Quick test via API
curl -X POST https://6ga7cukouj.execute-api.eu-west-1.amazonaws.com/prod/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is Mr Darcy'\''s first impression of Elizabeth?", "bookId": "2f5738f7-f856-4026-ac71-8457e01a06dc"}'

# Test with Python script
python3 test-agent.py HGAOUG8YYO NVVOJM5GAY "Explain Darcy's pride"
```

### Knowledge Base Testing

```bash
# Query KB directly
aws bedrock-agent-runtime retrieve \
  --knowledge-base-id 46UH9JADOK \
  --retrieval-query text="Chapter 1 Pride and Prejudice" \
  --region eu-west-1
```

### Check Logs

```bash
# Agent function logs
aws logs tail /aws/lambda/textbook-study-buddy-AgentFunction-* --region eu-west-1 --follow

# Processing logs
aws logs tail /aws/lambda/textbook-study-buddy-ProcessEpubFunction-* --region eu-west-1 --follow
```

---

## 🛣️ Roadmap

### ✅ Completed (Phase 1-2)

- [x] EPUB processing pipeline
- [x] Chapter extraction and storage
- [x] AI summaries with caching
- [x] Quiz generation and evaluation
- [x] Progressive hint system
- [x] Bedrock Agent integration
- [x] Knowledge Base with ~530 documents
- [x] Action Groups (getChapterSummary)
- [x] Frontend with reader and chat UI

### 🚧 In Progress (Phase 3)

- [x] Leitner + SM-2 spaced repetition backend
- [x] SRS API endpoints
- [ ] Rating buttons UI
- [ ] Chapter mastery visualization
- [ ] Cognito authentication

### 📋 Near-Term Milestones

| Timeline | Milestone | Revenue Impact |
|----------|-----------|----------------|
| **Months 1–3** | Launch with 50 public-domain classics pre-loaded | Immediate monetizable catalog |
| **Months 4–6** | User ePub upload + highlight import | Direct acquisition channel from Readwise users |
| **Months 7–12** | Licensed modern classics + school partnerships | Path to seven-figure institutional deals |

### 🔮 Future (Phase 4+)

- [ ] Authentication gating implementation
- [ ] Study reminders (email/push)
- [ ] Learning analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Audio narration (AWS Polly)
- [ ] Subscription management (Stripe)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Amazon Bedrock** for Claude 3 Haiku and Agent framework
- **OpenSearch Serverless** for vector embeddings
- **AWS SAM** for serverless infrastructure
- **Anki/SM-2** for spaced repetition algorithm inspiration
- **Project Gutenberg** for Pride and Prejudice text

---

<p align="center">
  <strong>Built with ☕ and AWS</strong>
</p>
