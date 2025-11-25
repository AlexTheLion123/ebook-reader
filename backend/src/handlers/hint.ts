import { APIGatewayProxyHandler } from 'aws-lambda';
import { getItem } from '../utils/dynamodb';
import { getObject } from '../utils/s3';
import { answerQuestion } from '../utils/bedrock';

interface HintRequest {
  bookId: string;
  chapterNumber?: number;
  question: string;
  hintLevel: 1 | 2 | 3;
  questionType?: 'MCQ' | 'SHORT_ANSWER' | 'FILL_BLANK' | 'TRUE_FALSE';
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { bookId, chapterNumber, question, hintLevel, questionType }: HintRequest = JSON.parse(event.body || '{}');

    if (!bookId || !question || !hintLevel) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'bookId, question, and hintLevel required' }) 
      };
    }

    if (hintLevel < 1 || hintLevel > 3) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'hintLevel must be 1, 2, or 3' }) 
      };
    }

    // Get book metadata
    const bookMeta = await getItem(process.env.CONTENT_TABLE!, { 
      PK: `book#${bookId}`, 
      SK: 'metadata' 
    });

    // Get chapter content for context
    const chapterNum = chapterNumber || 1;
    const chapter = await getItem(process.env.CONTENT_TABLE!, { 
      PK: `book#${bookId}`, 
      SK: `chapter#${chapterNum}` 
    });
    
    if (!chapter) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Chapter not found' }) };
    }

    // Use textContent if available (TeX books), otherwise fetch from S3
    let context: string;
    if (chapter.textContent) {
      context = chapter.textContent;
    } else if (chapter.s3Key) {
      const contentBuffer = await getObject(process.env.BOOKS_BUCKET!, chapter.s3Key);
      const htmlContent = contentBuffer.toString('utf-8');
      context = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      return { statusCode: 404, body: JSON.stringify({ error: 'Chapter content not available' }) };
    }

    // Progressive hint prompts
    const hintPrompts = {
      1: `You are a helpful tutor. A student is working on this question: "${question}"

Provide a SUBTLE hint that nudges them in the right direction without giving away the answer. 
- Don't mention specific answers or options
- Ask a guiding question or point to a relevant concept
- Keep it brief (2-3 sentences max)
- Be encouraging

Context from the book: ${context.substring(0, 3000)}`,

      2: `You are a helpful tutor. A student needs more help with this question: "${question}"

They already received a subtle hint but need more guidance. Provide a MODERATE hint that:
- Points to the specific section or concept in the book
- Explains the reasoning approach without solving it
- Gives a concrete example or analogy if helpful
- Still requires them to make the final connection

Context from the book: ${context.substring(0, 3000)}`,

      3: `You are a helpful tutor. A student is struggling with this question: "${question}"

They need a DETAILED explanation that:
- Walks through the reasoning step-by-step
- Explains the key concept clearly
- Helps them understand WHY the answer is what it is
- Stops just short of stating the exact answer (let them make the final choice)

Context from the book: ${context.substring(0, 3000)}`
    };

    const prompt = hintPrompts[hintLevel];
    const hint = await answerQuestion(prompt, context, bookMeta?.title);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        hint, 
        hintLevel,
        bookId, 
        chapterNumber: chapterNum 
      })
    };
  } catch (error) {
    console.error('Hint generation error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to generate hint', details: String(error) }) 
    };
  }
};
