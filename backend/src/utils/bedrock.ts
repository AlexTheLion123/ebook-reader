import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'eu-west-1' });

interface InvokeModelOptions {
  maxTokens?: number;
  temperature?: number;
}

export const invokeModel = async (
  prompt: string, 
  systemPrompt?: string,
  options: InvokeModelOptions = {}
): Promise<string> => {
  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      ...(systemPrompt && { system: systemPrompt })
    })
  });

  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
};

export const generateChapterSummary = async (chapterContent: string, chapterTitle: string): Promise<string> => {
  const systemPrompt = `You are a helpful study assistant. Create clear, concise chapter summaries that help students understand and remember key concepts.`;
  
  const prompt = `Summarize this chapter titled "${chapterTitle}".

Provide:
1. A brief 2-3 sentence overview
2. 3-5 key points or main ideas
3. Important concepts or terms introduced

Chapter content:
${chapterContent.slice(0, 50000)}`; // Limit to ~50k chars to stay within token limits

  return invokeModel(prompt, systemPrompt, { maxTokens: 1000 });
};

export const answerQuestion = async (question: string, context: string, bookTitle?: string, quizMode?: boolean): Promise<string> => {
  const systemPrompt = quizMode
    ? `You are a helpful tutor assisting a student during a quiz. IMPORTANT: Never directly give away answers to quiz questions. Instead, guide students to discover answers themselves through hints, questions, and explanations of concepts. Help them learn, don't just tell them the answer.`
    : `You are a helpful study assistant. Answer questions based on the provided book content. Be accurate and cite specific information from the text when possible.`;
  
  const prompt = quizMode
    ? `A student taking a quiz has a question. Help them understand the concept without giving away the answer.

Their question: ${question}

Book content${bookTitle ? ` from "${bookTitle}"` : ''}:
${context.slice(0, 50000)}

Provide guidance that helps them think through the problem, but don't state the answer directly.`
    : `Based on the following content${bookTitle ? ` from "${bookTitle}"` : ''}, answer this question:

Question: ${question}

Content:
${context.slice(0, 50000)}

Provide a clear, accurate answer based only on the information provided.`;

  return invokeModel(prompt, systemPrompt, { maxTokens: 1500 });
};
