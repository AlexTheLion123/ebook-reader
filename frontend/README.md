# QuickBook Frontend

The React + TypeScript frontend for QuickBook, an AI-powered textbook reader.

## Tech Stack

- **React 18** + TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **AWS Amplify** for hosting

## Features

- 📚 **Reader View** - Chapter-by-chapter book navigation
- 🤖 **AI Chat Sidebar** - Bedrock Agent integration for tutoring
- 📝 **Test Suite** - Adaptive quizzes with Leitner SRS
- 📊 **Progress Tracking** - Chapter mastery visualization
- 🔐 **Cognito Auth** - User authentication

## Run Locally

**Prerequisites:** Node.js 20.x

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables:
   ```env
   VITE_API_BASE_URL=https://6ga7cukouj.execute-api.eu-west-1.amazonaws.com/prod
   VITE_COGNITO_USER_POOL_ID=eu-west-1_XXXXXXXXX
   VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_COGNITO_DOMAIN=quickbook-auth-XXXXXX.auth.eu-west-1.amazoncognito.com
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

## Build for Production

```bash
npm run build
```

Output is in the `dist/` folder, deployed automatically via AWS Amplify.

## Key Components

| Component | Purpose |
|-----------|---------|
| `ReaderView.tsx` | Book reading interface with chapter navigation |
| `TestSuite.tsx` | Adaptive testing with SRS rating buttons |
| `AgentChatSidebar.tsx` | AI tutor chat powered by Bedrock Agent |
| `BookDetail.tsx` | Book overview with chapter mastery map |
| `Dashboard.tsx` | User's active books and progress |

## API Integration

All API calls go through `services/backendService.ts`:

- `GET /books` - List all books
- `GET /content/{bookId}?chapter={n}` - Get chapter HTML
- `POST /agent/chat` - AI tutor conversation
- `POST /srs/next-batch` - Get SRS questions
- `POST /srs/submit-answer` - Submit answer with rating
