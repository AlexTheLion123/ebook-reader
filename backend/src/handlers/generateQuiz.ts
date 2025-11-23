import { APIGatewayProxyHandler } from 'aws-lambda';
import { getItem, putItem } from '../utils/dynamodb';
import { getObject } from '../utils/s3';
import { invokeModel } from '../utils/bedrock';

interface GenerateQuizRequest {
  bookId: string;
  chapterNumber: number;
  questionCount?: number;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { bookId, chapterNumber, questionCount = 5 }: GenerateQuizRequest = JSON.parse(event.body || '{}');

    if (!bookId || !chapterNumber) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'bookId and chapterNumber required' }) 
      };
    }

    const pk = `book#${bookId}`;
    const chapterSK = `chapter#${chapterNumber}`;
    const quizSK = `quiz#${chapterNumber}`;

    // Check if quiz already exists (cached)
    const cachedQuiz = await getItem(process.env.CONTENT_TABLE!, { PK: pk, SK: quizSK });
    if (cachedQuiz?.questions) {
      console.log(`Returning cached quiz for ${bookId} chapter ${chapterNumber}`);
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          questions: cachedQuiz.questions, 
          bookId, 
          chapterNumber,
          cached: true 
        })
      };
    }

    // Get chapter content
    const chapter = await getItem(process.env.CONTENT_TABLE!, { PK: pk, SK: chapterSK });
    if (!chapter?.s3Key) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Chapter not found' }) };
    }

    const contentBuffer = await getObject(process.env.BOOKS_BUCKET!, chapter.s3Key);
    const htmlContent = contentBuffer.toString('utf-8');
    const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Generate quiz using Bedrock
    const systemPrompt = `You are a helpful study assistant creating quiz questions. Generate questions that test understanding of key concepts.`;
    
    const prompt = `Based on this chapter titled "${chapter.title || `Chapter ${chapterNumber}`}", generate ${questionCount} multiple-choice questions.

Chapter content:
${textContent.slice(0, 40000)}

Return ONLY a valid JSON array with this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of the correct answer"
  }
]

Make questions clear and test understanding of key concepts.`;

    console.log(`Generating quiz for ${bookId} chapter ${chapterNumber}`);
    const response = await invokeModel(prompt, systemPrompt, { maxTokens: 2000 });

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse quiz JSON from response');
    }
    
    const questions = JSON.parse(jsonMatch[0]);

    // Cache the quiz
    await putItem(process.env.CONTENT_TABLE!, {
      PK: pk,
      SK: quizSK,
      type: 'quiz',
      chapterNumber,
      questions,
      generatedAt: Date.now()
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ questions, bookId, chapterNumber, cached: false })
    };
  } catch (error) {
    console.error('Quiz generation error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to generate quiz', details: String(error) }) 
    };
  }
};
