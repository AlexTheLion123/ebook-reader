/**
 * AgentChatSidebar - Unified AI tutor interface using Bedrock Agent
 * 
 * Replaces individual AI buttons with a conversational interface that can:
 * - Answer questions about the textbook
 * - Generate quizzes
 * - Provide progressive hints
 * - Track learning progress
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, FileText, HelpCircle, Send, BookOpen, Lightbulb, RotateCcw, Loader2, Search, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { BookDetails } from '../types';
import { 
  sendMessage, 
  sendAction, 
  getConversationHistory, 
  clearSession,
  ChatMessage,
  AgentChatResponse,
  hasQuizInResponse,
  getQuizFromResponse,
  ToolCall
} from '../services/agentService';

interface AgentChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookDetails;
  currentChapterIndex: number;
}

interface QuizState {
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
  currentQuestion: number;
  answers: number[];
  showResults: boolean;
}

export const AgentChatSidebar: React.FC<AgentChatSidebarProps> = ({ 
  isOpen, 
  onClose, 
  book, 
  currentChapterIndex 
}) => {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const bookId = (book as any).id || '';

  // Load conversation history on mount/open
  useEffect(() => {
    if (isOpen && bookId) {
      const history = getConversationHistory(bookId);
      if (history.length === 0) {
        // Add welcome message
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your AI tutor for **${book.title}**. I can help you:\n\n` +
            `- 📚 Explain concepts from the textbook\n` +
            `- ❓ Answer your questions\n` +
            `- 📝 Generate practice quizzes\n` +
            `- 💡 Provide hints when you're stuck\n\n` +
            `What would you like to learn about?`,
          timestamp: Date.now(),
        }]);
      } else {
        setMessages(history);
      }
    }
  }, [isOpen, bookId, book.title]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Handle tool call notifications
  const handleToolCall = (tool: string, status: 'started' | 'completed') => {
    if (status === 'started') {
      setActiveToolCall(tool);
    } else {
      setActiveToolCall(null);
    }
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const text = overrideText || chatInput;
    if (!text.trim() || isLoading) return;

    setChatInput('');
    setIsLoading(true);
    
    // Add optimistic user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await sendMessage(bookId, text, handleToolCall);
      
      // Update messages from the response
      const history = getConversationHistory(bookId);
      setMessages(history);
      
      // Check for quiz in response
      if (hasQuizInResponse(response)) {
        const quizData = getQuizFromResponse(response);
        if (quizData && quizData.length > 0) {
          setQuizState({
            questions: quizData,
            currentQuestion: 0,
            answers: [],
            showResults: false,
          });
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMessage.id),
        tempUserMessage,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          timestamp: Date.now(),
        }
      ]);
    } finally {
      setIsLoading(false);
      setActiveToolCall(null);
    }
  };

  // Quick action handlers
  const handleSummarize = () => {
    handleSendMessage(undefined, `Please summarize the key concepts from chapter ${currentChapterIndex + 1}.`);
  };

  const handleQuiz = () => {
    handleSendMessage(undefined, `Generate a quiz with 5 questions for chapter ${currentChapterIndex + 1}.`);
  };

  const handlePractice = () => {
    handleSendMessage(undefined, `I want to practice the concepts from chapter ${currentChapterIndex + 1}. Can you give me a problem to work through?`);
  };

  const handleClearChat = () => {
    clearSession(bookId);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Chat cleared! I'm ready to help you learn. What would you like to study?`,
      timestamp: Date.now(),
    }]);
    setQuizState(null);
  };

  // Quiz interaction handlers
  const handleQuizAnswer = (answerIndex: number) => {
    if (!quizState) return;
    
    const newAnswers = [...quizState.answers, answerIndex];
    
    if (quizState.currentQuestion < quizState.questions.length - 1) {
      setQuizState({
        ...quizState,
        currentQuestion: quizState.currentQuestion + 1,
        answers: newAnswers,
      });
    } else {
      // Quiz complete, show results
      setQuizState({
        ...quizState,
        answers: newAnswers,
        showResults: true,
      });
      
      // Calculate score and send to agent
      const score = newAnswers.reduce((acc, ans, idx) => 
        acc + (ans === quizState.questions[idx].correctAnswer ? 1 : 0), 0
      );
      const percentage = Math.round((score / quizState.questions.length) * 100);
      
      handleSendMessage(undefined, 
        `I completed the quiz! I got ${score} out of ${quizState.questions.length} correct (${percentage}%). ` +
        `Can you explain the ones I got wrong?`
      );
    }
  };

  const closeQuiz = () => {
    setQuizState(null);
  };

  // Tool call indicator
  const getToolCallLabel = (tool: string): string => {
    const labels: Record<string, string> = {
      generateQuiz: '📝 Generating quiz...',
      getHint: '💡 Getting hint...',
      evaluateAnswer: '✓ Evaluating answer...',
      trackProgress: '📊 Updating progress...',
      getLearningSummary: '📈 Getting summary...',
    };
    return labels[tool] || `🔧 ${tool}...`;
  };

  // Render tool call badges
  const renderToolCalls = (toolCalls?: ToolCall[]) => {
    if (!toolCalls || toolCalls.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {toolCalls.map((tc, idx) => (
          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-orange/20 text-brand-orange">
            <Wrench className="w-3 h-3" />
            {tc.tool}
          </span>
        ))}
      </div>
    );
  };

  // Render knowledge base results indicator
  const renderKBResults = (results?: { content: string; source?: string }[]) => {
    if (!results || results.length === 0) return null;
    
    return (
      <div className="flex items-center gap-1 mt-2 text-xs text-brand-cream/50">
        <Search className="w-3 h-3" />
        <span>Found {results.length} relevant section{results.length > 1 ? 's' : ''} from the textbook</span>
      </div>
    );
  };

  return (
    <div className={`absolute top-0 right-0 h-full w-full md:w-96 bg-[#1a110e]/95 backdrop-blur-xl border-l border-[#A1887F]/20 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <div className="p-3 md:p-5 border-b border-[#A1887F]/20 flex items-center justify-between bg-[#2a1d18]/50">
        <div className="flex items-center gap-2">
          <div className="bg-brand-orange/20 p-2 rounded-lg">
            <Bot className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base md:text-lg">AI Tutor</h3>
            <p className="text-[10px] md:text-xs text-brand-cream/50">Chapter {currentChapterIndex + 1}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearChat}
            className="text-brand-cream/40 hover:text-white transition-colors p-1"
            title="Clear chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="text-brand-cream/40 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-[#A1887F]/20 bg-[#2a1d18]/30 grid grid-cols-3 gap-2">
        <button
          onClick={handleSummarize}
          disabled={isLoading}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-orange/30 transition-all text-center gap-1 group disabled:opacity-50"
        >
          <FileText className="w-4 h-4 text-brand-orange group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold text-brand-cream/80 group-hover:text-white">Summary</span>
        </button>

        <button
          onClick={handleQuiz}
          disabled={isLoading}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-orange/30 transition-all text-center gap-1 group disabled:opacity-50"
        >
          <HelpCircle className="w-4 h-4 text-brand-orange group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold text-brand-cream/80 group-hover:text-white">Quiz</span>
        </button>

        <button
          onClick={handlePractice}
          disabled={isLoading}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-orange/30 transition-all text-center gap-1 group disabled:opacity-50"
        >
          <Lightbulb className="w-4 h-4 text-brand-orange group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold text-brand-cream/80 group-hover:text-white">Practice</span>
        </button>
      </div>

      {/* Quiz Mode Overlay */}
      {quizState && !quizState.showResults && (
        <div className="absolute inset-0 bg-[#1a110e]/98 z-10 flex flex-col p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold">
              Question {quizState.currentQuestion + 1} of {quizState.questions.length}
            </h3>
            <button onClick={closeQuiz} className="text-brand-cream/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1">
            <p className="text-brand-cream mb-4 text-lg">
              {quizState.questions[quizState.currentQuestion].question}
            </p>
            
            <div className="space-y-2">
              {quizState.questions[quizState.currentQuestion].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuizAnswer(idx)}
                  className="w-full p-3 rounded-lg bg-white/5 hover:bg-brand-orange/20 border border-white/10 hover:border-brand-orange/50 text-left text-brand-cream transition-all"
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              ))}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-orange transition-all"
              style={{ width: `${((quizState.currentQuestion) / quizState.questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed animate-fade-in ${
              msg.role === 'user' 
                ? 'bg-brand-orange text-white rounded-tr-none shadow-lg' 
                : 'bg-[#3E2723] text-brand-cream border border-[#A1887F]/20 rounded-tl-none'
            }`}>
              {msg.role === 'assistant' ? (
                <div>
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                      li: ({children}) => <li className="mb-1 [&>p]:mb-0">{children}</li>,
                      strong: ({children}) => <span className="font-bold text-brand-orange/90">{children}</span>,
                      code: ({children, className}) => {
                        const isInline = !className;
                        return isInline 
                          ? <code className="bg-black/30 px-1 rounded text-brand-orange/80">{children}</code>
                          : <code className="block bg-black/30 p-2 rounded my-2 overflow-x-auto">{children}</code>;
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  {renderToolCalls(msg.toolCalls)}
                  {renderKBResults(msg.knowledgeBaseResults)}
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-[#3E2723] text-brand-cream border border-[#A1887F]/20 rounded-2xl rounded-tl-none p-3">
              {activeToolCall ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                  <span className="text-sm">{getToolCallLabel(activeToolCall)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-brand-orange/50 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-1.5 h-1.5 bg-brand-orange/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-brand-orange/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[#A1887F]/20 bg-[#2a1d18]/50">
        <form onSubmit={handleSendMessage} className="relative">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask me anything about the chapter..."
            disabled={isLoading}
            className="w-full bg-black/20 border border-[#A1887F]/30 rounded-xl py-3 pl-4 pr-12 text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!chatInput.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-orange text-white rounded-lg hover:bg-brand-darkOrange transition-colors disabled:opacity-50 disabled:hover:bg-brand-orange"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentChatSidebar;
