import { APIGatewayProxyHandler } from 'aws-lambda';
import { invokeModel } from '../utils/bedrock';

interface EvaluateAnswerRequest {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'FILL_BLANK' | 'SHORT_ANSWER' | 'BRIEF_RESPONSE';
  // Optional enhanced fields for better evaluation
  acceptableAnswers?: string[];
  rubric?: string;
}

interface EvaluateAnswerResponse {
  isCorrect: boolean;
  score: number; // 0.0 - 1.0
  feedback: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { 
      question, 
      userAnswer, 
      correctAnswer, 
      type,
      acceptableAnswers,
      rubric 
    }: EvaluateAnswerRequest = JSON.parse(event.body || '{}');

    if (!question || userAnswer === undefined || !correctAnswer || !type) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'question, userAnswer, correctAnswer, and type required' }) 
      };
    }

    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();

    // Handle exact-match types: MCQ, TRUE_FALSE, FILL_BLANK
    if (type === 'MCQ' || type === 'TRUE_FALSE') {
      const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
      const response: EvaluateAnswerResponse = {
        isCorrect,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctAnswer}`
      };
      return { statusCode: 200, headers, body: JSON.stringify(response) };
    }

    // FILL_BLANK: check against correctAnswer and acceptableAnswers
    if (type === 'FILL_BLANK') {
      const allAcceptable = [normalizedCorrectAnswer, ...(acceptableAnswers || []).map(a => a.trim().toLowerCase())];
      const isCorrect = allAcceptable.some(acceptable => 
        normalizedUserAnswer === acceptable || 
        normalizedUserAnswer.includes(acceptable) ||
        acceptable.includes(normalizedUserAnswer)
      );
      const response: EvaluateAnswerResponse = {
        isCorrect,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctAnswer}`
      };
      return { statusCode: 200, headers, body: JSON.stringify(response) };
    }

    // SHORT_ANSWER and BRIEF_RESPONSE: Use AI for evaluation
    const systemPrompt = `You are an expert study assistant evaluating student answers. Be fair but thorough. Consider partial credit for partially correct answers.`;
    
    let evaluationContext = `Question: ${question}

Expected Answer: ${correctAnswer}`;

    if (acceptableAnswers && acceptableAnswers.length > 0) {
      evaluationContext += `\n\nAlso acceptable: ${acceptableAnswers.join('; ')}`;
    }

    if (rubric) {
      evaluationContext += `\n\nGrading Rubric: ${rubric}`;
    }

    const prompt = `${evaluationContext}

Student's Answer: ${userAnswer}

Evaluate the student's answer. Consider:
1. Key concepts covered
2. Accuracy of information
3. Completeness of response
${rubric ? '4. How well it meets the rubric criteria' : ''}

Respond with ONLY valid JSON in this exact format:
{
  "score": <number from 0.0 to 1.0>,
  "isCorrect": <true if score >= 0.7, else false>,
  "feedback": "<2-3 sentence explanation of the score>"
}`;

    const response = await invokeModel(prompt, systemPrompt, { maxTokens: 500 });
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse evaluation JSON from response');
    }
    
    const evaluation = JSON.parse(jsonMatch[0]);
    
    // Ensure response has required fields
    const evaluationResponse: EvaluateAnswerResponse = {
      score: Math.max(0, Math.min(1, evaluation.score || 0)),
      isCorrect: evaluation.isCorrect ?? (evaluation.score >= 0.7),
      feedback: evaluation.feedback || 'Unable to evaluate answer.',
    };

    return { statusCode: 200, headers, body: JSON.stringify(evaluationResponse) };
  } catch (error) {
    console.error('Answer evaluation error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to evaluate answer', details: String(error) }) 
    };
  }
};
