import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface InvokeModelOptions {
  maxTokens?: number;
  temperature?: number;
}

export const invokeModel = async (
  prompt: string, 
  systemPrompt?: string,
  options: InvokeModelOptions = {}
): Promise<string> => {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  
  const body = {
    inputText: fullPrompt,
    textGenerationConfig: {
      maxTokenCount: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      topP: 0.9
    }
  };

  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-text-express-v1',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body)
  });

  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.results[0].outputText;
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

export const answerQuestion = async (question: string, context: string, bookTitle?: string): Promise<string> => {
  const systemPrompt = `You are a helpful study assistant. Answer questions based on the provided book content. Be accurate and cite specific information from the text when possible.`;
  
  const prompt = `Based on the following content${bookTitle ? ` from "${bookTitle}"` : ''}, answer this question:

Question: ${question}

Content:
${context.slice(0, 50000)}

Provide a clear, accurate answer based only on the information provided.`;

  return invokeModel(prompt, systemPrompt, { maxTokens: 1500 });
};
