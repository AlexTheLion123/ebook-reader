/**
 * Agent Service for QuickBook
 * 
 * Unified interface for interacting with the Bedrock Agent tutor.
 * Replaces individual AI endpoint calls with a single conversational interface.
 */

const BASE_URL = 'https://6ga7cukouj.execute-api.eu-west-1.amazonaws.com/prod';

// Session storage key
const SESSION_STORAGE_KEY = 'quickbook_agent_session';

/**
 * Tool call information from agent response
 */
export interface ToolCall {
  tool: string;
  input?: Record<string, string>;
  output?: string;
}

/**
 * Knowledge base result from agent response
 */
export interface KnowledgeBaseResult {
  content: string;
  source?: string;
}

/**
 * Agent chat response
 */
export interface AgentChatResponse {
  response: string;
  sessionId: string;
  toolCalls?: ToolCall[];
  knowledgeBaseResults?: KnowledgeBaseResult[];
}

/**
 * Chat message for conversation history
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  knowledgeBaseResults?: KnowledgeBaseResult[];
  isLoading?: boolean;
}

/**
 * Session state stored in browser
 */
interface SessionState {
  sessionId: string;
  bookId: string;
  messages: ChatMessage[];
  createdAt: number;
}

/**
 * Get or create session for a book
 */
function getSession(bookId: string): SessionState {
  const stored = localStorage.getItem(`${SESSION_STORAGE_KEY}_${bookId}`);
  
  if (stored) {
    try {
      const session = JSON.parse(stored) as SessionState;
      // Check if session is less than 24 hours old
      if (Date.now() - session.createdAt < 24 * 60 * 60 * 1000) {
        return session;
      }
    } catch (e) {
      console.error('Failed to parse session:', e);
    }
  }
  
  // Create new session
  const newSession: SessionState = {
    sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    bookId,
    messages: [],
    createdAt: Date.now(),
  };
  
  saveSession(newSession);
  return newSession;
}

/**
 * Save session to storage
 */
function saveSession(session: SessionState): void {
  localStorage.setItem(
    `${SESSION_STORAGE_KEY}_${session.bookId}`,
    JSON.stringify(session)
  );
}

/**
 * Clear session for a book
 */
export function clearSession(bookId: string): void {
  localStorage.removeItem(`${SESSION_STORAGE_KEY}_${bookId}`);
}

/**
 * Get conversation history for a book
 */
export function getConversationHistory(bookId: string): ChatMessage[] {
  const session = getSession(bookId);
  return session.messages;
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Quiz mode context for the agent
 * Pass the full question JSON so the agent can grade, give hints, and show explanations
 */
export interface QuizModeContext {
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
 * Send a message to the agent and get a response
 * 
 * @param bookId - The book ID for context
 * @param message - The user's message
 * @param onToolCall - Optional callback for tool call status
 * @param quizContext - Optional quiz mode context (quiz vs study mode)
 */
export async function sendMessage(
  bookId: string,
  message: string,
  onToolCall?: (tool: string, status: 'started' | 'completed') => void,
  quizContext?: QuizModeContext
): Promise<AgentChatResponse> {
  const session = getSession(bookId);
  
  // Add user message to history
  const userMessage: ChatMessage = {
    id: generateMessageId(),
    role: 'user',
    content: message,
    timestamp: Date.now(),
  };
  session.messages.push(userMessage);
  saveSession(session);
  
  try {
    const response = await fetch(`${BASE_URL}/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        message,
        bookId,
        enableTrace: true,
        quizContext, // Pass quiz mode context to backend
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Request failed: ${response.statusText}`);
    }

    const data: AgentChatResponse = await response.json();
    
    // Update session ID if changed
    if (data.sessionId !== session.sessionId) {
      session.sessionId = data.sessionId;
    }
    
    // Notify about tool calls
    if (data.toolCalls && onToolCall) {
      for (const tc of data.toolCalls) {
        onToolCall(tc.tool, 'completed');
      }
    }
    
    // Add assistant message to history
    const assistantMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: data.response,
      timestamp: Date.now(),
      toolCalls: data.toolCalls,
      knowledgeBaseResults: data.knowledgeBaseResults,
    };
    session.messages.push(assistantMessage);
    saveSession(session);
    
    return data;
  } catch (error) {
    // Remove the user message on error
    session.messages = session.messages.filter(m => m.id !== userMessage.id);
    saveSession(session);
    throw error;
  }
}

/**
 * Send a predefined action to the agent (e.g., "Generate a quiz on chapter 3")
 */
export async function sendAction(
  bookId: string,
  action: 'quiz' | 'summary' | 'practice',
  chapterNumber: number,
  options?: {
    topic?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionCount?: number;
  }
): Promise<AgentChatResponse> {
  let message: string;
  
  switch (action) {
    case 'quiz':
      message = `Generate a ${options?.difficulty || 'medium'} difficulty quiz with ${options?.questionCount || 5} questions`;
      if (options?.topic) {
        message += ` about "${options.topic}"`;
      }
      message += ` for chapter ${chapterNumber}.`;
      break;
      
    case 'summary':
      message = `Give me a summary of the key concepts in chapter ${chapterNumber}.`;
      break;
      
    case 'practice':
      message = `I want to practice the concepts from chapter ${chapterNumber}. Can you help me work through some problems?`;
      break;
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }
  
  return sendMessage(bookId, message);
}

/**
 * Ask for help with a specific question
 */
export async function askForHelp(
  bookId: string,
  question: string,
  chapterNumber: number
): Promise<AgentChatResponse> {
  const message = `I'm studying chapter ${chapterNumber} and I need help with this: ${question}`;
  return sendMessage(bookId, message);
}

/**
 * Request a hint for a quiz question
 */
export async function requestHint(
  bookId: string,
  question: string,
  hintLevel: 1 | 2 | 3
): Promise<AgentChatResponse> {
  const hintRequest = hintLevel === 1 
    ? `I'm stuck on this question and need a small hint: "${question}"`
    : hintLevel === 2
    ? `I still need more help with this question: "${question}". Can you give me a bigger hint?`
    : `I really need help understanding this question: "${question}". Can you explain the approach in detail?`;
    
  return sendMessage(bookId, hintRequest);
}

/**
 * Submit an answer for evaluation
 */
export async function submitAnswer(
  bookId: string,
  question: string,
  answer: string
): Promise<AgentChatResponse> {
  const message = `Here's my answer to the question "${question}": ${answer}. Is this correct?`;
  return sendMessage(bookId, message);
}

/**
 * Start a new conversation topic
 */
export async function startNewTopic(
  bookId: string,
  topic: string,
  chapterNumber?: number
): Promise<AgentChatResponse> {
  let message = `I'd like to learn about ${topic}`;
  if (chapterNumber) {
    message += ` from chapter ${chapterNumber}`;
  }
  message += '. Can you explain it to me?';
  
  return sendMessage(bookId, message);
}

/**
 * Parse quiz questions from agent response
 */
export function parseQuizFromResponse(response: string): Array<{
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}> | null {
  try {
    // Try to find JSON array in response
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Try to find JSON in tool call output
    return null;
  } catch (e) {
    console.error('Failed to parse quiz from response:', e);
    return null;
  }
}

/**
 * Check if a response contains a quiz
 */
export function hasQuizInResponse(response: AgentChatResponse): boolean {
  // Check tool calls for generateQuiz
  if (response.toolCalls?.some(tc => tc.tool === 'generateQuiz' && tc.output)) {
    return true;
  }
  
  // Check response text for quiz-like JSON
  return /\[\s*\{[^}]*"question"/.test(response.response);
}

/**
 * Get quiz data from response
 */
export function getQuizFromResponse(response: AgentChatResponse): Array<{
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}> | null {
  // First check tool call output
  const quizToolCall = response.toolCalls?.find(tc => tc.tool === 'generateQuiz');
  if (quizToolCall?.output) {
    try {
      return JSON.parse(quizToolCall.output);
    } catch (e) {
      console.error('Failed to parse quiz from tool call:', e);
    }
  }
  
  // Fall back to parsing from response text
  return parseQuizFromResponse(response.response);
}
