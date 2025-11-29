import { APIGatewayProxyHandler } from 'aws-lambda';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION || 'eu-west-1' });

/**
 * Event types from agent stream
 */
interface AgentTraceEvent {
  preProcessingTrace?: {
    modelInvocationInput?: {
      inferenceConfiguration?: unknown;
    };
  };
  orchestrationTrace?: {
    modelInvocationInput?: unknown;
    modelInvocationOutput?: {
      metadata?: unknown;
      rawResponse?: {
        content?: string;
      };
    };
    invocationInput?: {
      actionGroupInvocationInput?: {
        actionGroupName?: string;
        function?: string;
        parameters?: Array<{ name: string; value: string }>;
      };
      knowledgeBaseLookupInput?: {
        text?: string;
        knowledgeBaseId?: string;
      };
    };
    observation?: {
      actionGroupInvocationOutput?: {
        text?: string;
      };
      knowledgeBaseLookupOutput?: {
        retrievedReferences?: Array<{
          content?: { text?: string };
          location?: { s3Location?: { uri?: string } };
        }>;
      };
    };
  };
  postProcessingTrace?: unknown;
}

interface AgentResponse {
  response: string;
  sessionId: string;
  toolCalls?: Array<{
    tool: string;
    input?: Record<string, string>;
    output?: string;
  }>;
  knowledgeBaseResults?: Array<{
    content: string;
    source?: string;
  }>;
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Quiz mode context for the agent
 * The full question JSON is passed so the agent can grade, give hints, etc.
 */
interface QuizModeContext {
  mode: 'quiz' | 'study';
  currentQuestion?: {
    id: string;
    text: string;
    type: string;
    options?: string[];
    correctAnswer: string;
    acceptableAnswers?: string[];
    hints?: Array<{ level: string; text: string }>;
    explanation: string;
    rubric?: string;
    chapterNumber: number;
    tags?: {
      difficulty?: string;
      themes?: string[];
      elements?: string[];
    };
  };
  hintsUsed?: number; // Track how many hints have been revealed
}

/**
 * Build the mode block to inject into the agent message
 * In quiz mode, we pass the FULL question JSON so the agent can grade and give hints
 */
function buildModeBlock(quizContext?: QuizModeContext): string {
  if (!quizContext || quizContext.mode === 'study') {
    return `<<CONVERSATION MODE>>
Mode: study`;
  }

  // Quiz mode - pass the full question JSON
  if (quizContext.currentQuestion) {
    return `<<CONVERSATION MODE>>
Mode: quiz
Current question: ${JSON.stringify(quizContext.currentQuestion, null, 2)}
Hints used so far: ${quizContext.hintsUsed || 0}`;
  }

  // Quiz mode but no question loaded yet
  return `<<CONVERSATION MODE>>
Mode: quiz
No active question loaded.`;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { sessionId, message, bookId, enableTrace, quizContext } = JSON.parse(event.body || '{}');

    if (!message) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'message is required' })
      };
    }

    // Build the mode-aware message
    const modeBlock = buildModeBlock(quizContext as QuizModeContext | undefined);
    const enhancedMessage = `${modeBlock}\n\n---\nUser message: ${message}`;

    const agentId = process.env.AGENT_ID!;
    const agentAliasId = process.env.AGENT_ALIAS_ID!;
    const finalSessionId = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Invoking agent ${agentId} with session ${finalSessionId}`);
    console.log(`Mode: ${(quizContext as QuizModeContext)?.mode || 'study'}`);
    console.log(`Message: ${message.substring(0, 100)}...`);

    const command = new InvokeAgentCommand({
      agentId,
      agentAliasId,
      sessionId: finalSessionId,
      inputText: enhancedMessage,
      enableTrace: enableTrace ?? true,
      sessionState: bookId ? {
        sessionAttributes: {
          bookId,
          conversationMode: (quizContext as QuizModeContext)?.mode || 'study'
        }
      } : undefined
    });

    // Retry loop for rate limiting
    let lastError: Error | null = null;
    let response;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await client.send(command);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        const errorMessage = lastError.message || '';
        
        // Only retry on rate limiting errors
        if (errorMessage.includes('rate') || errorMessage.includes('throttl') || errorMessage.includes('ThrottlingException')) {
          console.log(`Rate limited, attempt ${attempt}/${MAX_RETRIES}. Retrying in ${RETRY_DELAY_MS * attempt}ms...`);
          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
            continue;
          }
        }
        throw error; // Non-retryable error
      }
    }
    
    if (!response) {
      throw lastError || new Error('Failed to invoke agent after retries');
    }

    // Collect response chunks and trace information
    const chunks: string[] = [];
    const toolCalls: AgentResponse['toolCalls'] = [];
    const knowledgeBaseResults: AgentResponse['knowledgeBaseResults'] = [];

    if (response.completion) {
      for await (const event of response.completion) {
        // Handle text chunks
        if (event.chunk?.bytes) {
          const text = new TextDecoder().decode(event.chunk.bytes);
          chunks.push(text);
        }

        // Handle trace events (tool calls, KB lookups)
        if (event.trace?.trace) {
          const trace = event.trace.trace as AgentTraceEvent;
          
          // Track action group invocations (tool calls)
          if (trace.orchestrationTrace?.invocationInput?.actionGroupInvocationInput) {
            const actionInput = trace.orchestrationTrace.invocationInput.actionGroupInvocationInput;
            toolCalls.push({
              tool: actionInput.function || actionInput.actionGroupName || 'unknown',
              input: actionInput.parameters?.reduce((acc, p) => {
                acc[p.name] = p.value;
                return acc;
              }, {} as Record<string, string>)
            });
            console.log(`Tool call: ${actionInput.function}`);
          }

          // Track action group outputs
          if (trace.orchestrationTrace?.observation?.actionGroupInvocationOutput) {
            const output = trace.orchestrationTrace.observation.actionGroupInvocationOutput;
            if (toolCalls.length > 0 && output.text) {
              toolCalls[toolCalls.length - 1].output = output.text;
            }
          }

          // Track knowledge base lookups
          if (trace.orchestrationTrace?.invocationInput?.knowledgeBaseLookupInput) {
            const kbInput = trace.orchestrationTrace.invocationInput.knowledgeBaseLookupInput;
            console.log(`KB lookup: ${kbInput.text?.substring(0, 50)}...`);
          }

          // Track knowledge base results
          if (trace.orchestrationTrace?.observation?.knowledgeBaseLookupOutput) {
            const kbOutput = trace.orchestrationTrace.observation.knowledgeBaseLookupOutput;
            if (kbOutput.retrievedReferences) {
              for (const ref of kbOutput.retrievedReferences) {
                if (ref.content?.text) {
                  knowledgeBaseResults.push({
                    content: ref.content.text,
                    source: ref.location?.s3Location?.uri
                  });
                }
              }
            }
          }
        }
      }
    }

    const fullResponse = chunks.join('');
    console.log(`Response length: ${fullResponse.length}, Tool calls: ${toolCalls.length}, KB results: ${knowledgeBaseResults.length}`);

    const agentResponse: AgentResponse = {
      response: fullResponse,
      sessionId: finalSessionId,
    };

    // Include tool calls and KB results if any
    if (toolCalls.length > 0) {
      agentResponse.toolCalls = toolCalls;
    }
    if (knowledgeBaseResults.length > 0) {
      agentResponse.knowledgeBaseResults = knowledgeBaseResults;
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(agentResponse)
    };
  } catch (error) {
    console.error('Agent invocation error:', error);
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    let userMessage = 'Failed to invoke agent';
    
    if (errorMessage.includes('ResourceNotFoundException')) {
      userMessage = 'Agent not found. Please check the agent configuration.';
    } else if (errorMessage.includes('ValidationException')) {
      userMessage = 'Invalid request. Please check the message format.';
    } else if (errorMessage.includes('ThrottlingException')) {
      userMessage = 'Too many requests. Please try again in a moment.';
    } else if (errorMessage.includes('AccessDeniedException')) {
      userMessage = 'Access denied. Please check IAM permissions.';
    }
    
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: userMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      })
    };
  }
};
