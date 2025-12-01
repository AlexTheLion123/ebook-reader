import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Sparkles, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BookDetails, Question } from '../types';
import { askQuestion, getHint } from '../services/backendService';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface HintSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookDetails;
  currentQuestion: Question | null;
}

export const HintSidebar: React.FC<HintSidebarProps> = ({
  isOpen,
  onClose,
  book,
  currentQuestion
}) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset hint when question changes
  useEffect(() => {
    setHintLevel(0);
    setChatMessages([]);
  }, [currentQuestion]);

  // Scroll chat
  useEffect(() => {
    if(isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen, isAiThinking]);

  // Early return if sidebar is closed or no question
  if (!isOpen) return null;
  
  if (!currentQuestion) {
    return (
      <div className={`fixed top-0 right-0 h-full w-full md:w-[360px] bg-[#3E2723] shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-out border-l border-[#A1887F]/30 translate-x-0`}>
        <div className="shrink-0 p-4 bg-[#2a1d18] border-b border-[#A1887F]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-orange/20 p-1.5 rounded-lg">
              <Bot className="w-5 h-5 text-brand-orange" />
            </div>
            <h3 className="font-bold text-white text-sm">AI Assist</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-brand-cream/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-brand-cream/50 text-sm">No question selected. Start a quiz to get AI assistance.</p>
        </div>
      </div>
    );
  }

  const handleSendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const textToSend = chatInput;
    const newMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
    setIsAiThinking(true);

    try {
      const bookId = (book as any).id;
      // Contextualize the question with the current quiz question
      const contextPrompt = `I am taking a quiz on this book. The current question is: "${currentQuestion.text}". My question is: ${textToSend}`;
      
      const chapterNumber = 1; 

      const response = await askQuestion(bookId, chapterNumber, contextPrompt, true);
      
      const aiResponse: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: response.answer 
      };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: "Sorry, I couldn't process that. Please try again." 
      }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleRevealHint = async () => {
      const nextLevel = hintLevel + 1;
      setHintLevel(nextLevel);
      
      if (nextLevel > 3) return;

      setIsAiThinking(true);
      
      // Add user message
      setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'user',
          text: `Reveal Hint (Level ${nextLevel})`
      }]);

      try {
          const bookId = (book as any).id;
          const chapterNumber = 1;
          
          const response = await getHint(
              bookId, 
              currentQuestion.text, 
              nextLevel as 1 | 2 | 3,
              chapterNumber,
              currentQuestion.type
          );
          
          setChatMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'ai',
              text: `**Hint Level ${nextLevel}:**\n\n${response.hint}`
          }]);
      } catch (error) {
          setChatMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'ai',
              text: "Could not load hint."
          }]);
      } finally {
          setIsAiThinking(false);
      }
  };

  return (
    <div className={`absolute top-0 right-0 h-full w-full md:w-96 bg-[#1a110e]/95 backdrop-blur-xl border-l border-[#A1887F]/20 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Sidebar Header */}
        <div className="p-3 md:p-5 border-b border-[#A1887F]/20 flex items-center justify-between bg-[#2a1d18]/50">
            <div className="flex items-center gap-2">
                <div className="bg-brand-orange/20 p-2 rounded-lg">
                    <Bot className="w-5 h-5 text-brand-orange" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-base md:text-lg">AI Tutor</h3>
                    <p className="text-[10px] md:text-xs text-brand-cream/50">Hints & Explanations</p>
                </div>
            </div>
            <button onClick={onClose} className="text-brand-cream/40 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Quick Hint Section */}
        <div className="p-4 border-b border-[#A1887F]/20 bg-[#2a1d18]/30">
          
          <div className="mb-2 p-3 bg-black/20 rounded-lg border border-white/5">
              <p className="text-xs font-bold text-brand-orange mb-1 uppercase tracking-wider">Current Question</p>
              <p className="text-sm text-brand-cream/90 leading-relaxed">{currentQuestion.text}</p>
          </div>

          {hintLevel < 3 && (
              <button 
                  onClick={handleRevealHint}
                  disabled={isAiThinking}
                  className="w-full flex flex-row md:flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-orange/30 transition-all text-center gap-2 md:gap-2 group"
              >
                  {isAiThinking ? (
                      <div className="p-1.5 rounded-full bg-brand-orange/10 text-brand-orange">
                          <div className="w-4 h-4 border-2 border-brand-orange/50 border-t-brand-orange rounded-full animate-spin" />
                      </div>
                  ) : (
                      <div className="p-1.5 rounded-full bg-brand-orange/10 text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-colors">
                          <Sparkles className="w-4 h-4" />
                      </div>
                  )}
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-cream/80 group-hover:text-white">
                          {hintLevel === 0 ? "Reveal Hint" : "Need more help?"}
                      </span>
                      <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-brand-cream/60 group-hover:text-white/80 transition-colors">
                          {hintLevel}/3
                      </span>
                  </div>
              </button>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed animate-fade-in ${
                        msg.role === 'user' 
                        ? 'bg-brand-orange text-white rounded-tr-none shadow-lg' 
                        : 'bg-[#3E2723] text-brand-cream border border-[#A1887F]/20 rounded-tl-none'
                    }`}>
                        {msg.role === 'ai' ? <ReactMarkdown components={{
                           p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
                           ul: ({children}) => <ul className="list-disc ml-4 mb-3">{children}</ul>,
                           li: ({children}) => <li className="mb-1.5 [&>p]:mb-0">{children}</li>,
                           strong: ({children}) => <span className="font-bold text-brand-orange/90">{children}</span>
                        }}>{msg.text}</ReactMarkdown> : msg.text}
                    </div>
                </div>
            ))}
            {isAiThinking && (
                <div className="flex justify-start animate-fade-in">
                    <div className="bg-[#3E2723] text-brand-cream border border-[#A1887F]/20 rounded-2xl rounded-tl-none p-4 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-brand-orange/50 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-1.5 h-1.5 bg-brand-orange/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 bg-brand-orange/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#A1887F]/20 bg-[#2a1d18]/50">
            <form onSubmit={handleSendChat} className="relative">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a specific question..."
                    className="w-full bg-black/20 border border-[#A1887F]/30 rounded-xl py-3 pl-4 pr-12 text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all"
                />
                <button 
                    type="submit"
                    disabled={!chatInput.trim() || isAiThinking}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-orange text-white rounded-lg hover:bg-brand-darkOrange transition-colors disabled:opacity-50 disabled:hover:bg-brand-orange"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    </div>
  );
};
