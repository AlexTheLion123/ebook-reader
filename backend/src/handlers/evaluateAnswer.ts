import { APIGatewayProxyHandler } from 'aws-lambda';
import { invokeModel } from '../utils/bedrock';

interface EvaluateAnswerRequest {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  type: 'multiple-choice' | 'short-answer';
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { question, userAnswer, correctAnswer, type }: EvaluateAnswerRequest = JSON.parse(event.body || '{}');

    if (!question || !userAnswer || !correctAnswer || !type) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'question, userAnswer, correctAnswer, and type required' }) 
      };
    }

    if (type === 'multiple-choice') {
      // Simple comparison for multiple choice
      const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          isCorrect,
          score: isCorrect ? 1 : 0,
          feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctAnswer}`
        })
      };
    }

    // For short-answer, use AI to evaluate
    const systemPrompt = `You are a helpful study assistant evaluating student answers. Be fair but thorough in your evaluation.`;
    
    const prompt = `Evaluate this student answer:

Question: ${question}
Correct Answer: ${correctAnswer}
Student Answer: ${userAnswer}

Provide evaluation in this JSON format:
{
  "score": 0.0-1.0,
  "feedback": "Brief feedback explaining the score",
  "isCorrect": true/false
}`;

    const response = await invokeModel(prompt, systemPrompt, { maxTokens: 500 });
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse evaluation JSON from response');
    }
    
    const evaluation = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(evaluation)
    };
  } catch (error) {
    console.error('Answer evaluation error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to evaluate answer', details: String(error) }) 
    };
  }
};
