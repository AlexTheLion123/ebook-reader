import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, FileText, HelpCircle, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BookDetails } from '../types';
import { askQuestion, summarizeChapter, generateQuiz } from '../services/backendService';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface AIAssistSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookDetails;
  currentChapterIndex: number;
}

export const AIAssistSidebar: React.FC<AIAssistSidebarProps> = ({ 
  isOpen, 
  onClose, 
  book, 
  currentChapterIndex 
}) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'ai', text: "Hello! I'm your literary companion. Feel free to ask me about the characters, themes, or plot of this book." }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom
  useEffect(() => {
    if(isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen, isAiThinking]);

  const handleSendChat = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const textToSend = overrideText || chatInput;
    if (!textToSend.trim()) return;

    // Add user message to chat
    const newMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');

    // Check if this is a summarize request
    if (textToSend.toLowerCase().includes('summarize')) {
      await handleSummarize();
      return;
    }

    // Check if this is a quiz request
    if (textToSend.toLowerCase().includes('quiz')) {
      await handleQuiz();
      return;
    }

    setIsAiThinking(true);

    try {
      const bookId = (book as any).id;
      if (!bookId) {
        throw new Error('Book ID not available');
      }
      const chapterNumber = currentChapterIndex + 1;
      const response = await askQuestion(bookId, chapterNumber, textToSend);
      
      const aiResponse: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: response.answer 
      };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorResponse: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: "I'm sorry, I encountered an error while processing your request. Please make sure the book content is loaded and try again." 
      };
      setChatMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSummarize = async () => {
    if (isAiThinking) return;
    
    setIsAiThinking(true);

    try {
      const bookId = (book as any).id;
      if (!bookId) {
        throw new Error('Book ID not available');
      }
      const chapterNumber = currentChapterIndex + 1;
      const response = await summarizeChapter(bookId, chapterNumber);
      
      const summaryText = response.cached 
        ? `**Chapter ${chapterNumber} Summary** _(cached)_\n\n${response.summary}`
        : `**Chapter ${chapterNumber} Summary**\n\n${response.summary}`;

      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        text: summaryText
      }]);
    } catch (error) {
      console.error("Summarize error:", error);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        text: "Failed to generate summary. Please make sure the book content is loaded and try again."
      }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleQuiz = async () => {
    if (isAiThinking) return;
    
    setIsAiThinking(true);

    try {
      const bookId = (book as any).id;
      if (!bookId) {
        throw new Error('Book ID not available');
      }
      const chapterNumber = currentChapterIndex + 1;
      const response = await generateQuiz(bookId, chapterNumber, 3);
      
      // Format quiz questions
      let quizText = response.cached 
        ? `**Chapter ${chapterNumber} Quiz** _(cached)_\n\n`
        : `**Chapter ${chapterNumber} Quiz**\n\n`;
      
      response.questions.forEach((q, index) => {
        quizText += `**Question ${index + 1}:** ${q.question}\n\n`;
        q.options.forEach((option, optIndex) => {
          quizText += `${String.fromCharCode(97 + optIndex)}) ${option}\n\n`;
        });
      });
      
      quizText += `*Think about your answers and reply with your choices (e.g., "1a, 2b, 3c").*`;

      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        text: quizText
      }]);
    } catch (error) {
      console.error("Quiz generation error:", error);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        text: "Failed to generate quiz. Please make sure the book content is loaded and try again."
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
                    <h3 className="text-white font-bold text-base md:text-lg">AI Companion</h3>
                    <p className="text-[10px] md:text-xs text-brand-cream/50">Always here to help</p>
                </div>
            </div>
            <button onClick={onClose} className="text-brand-cream/40 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-[#A1887F]/20 bg-[#2a1d18]/30 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSendChat(undefined, "Please summarize this chapter.")}
            disabled={isAiThinking}
            className="flex flex-row md:flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-orange/30 transition-all text-center gap-2 group"
          >
            <div className="p-2 rounded-full bg-brand-orange/10 text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-brand-cream/80 group-hover:text-white">Summarize</span>
          </button>

          <button
            onClick={() => handleSendChat(undefined, "Give me a short quiz for this chapter.")}
            disabled={isAiThinking}
            className="flex flex-row md:flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-orange/30 transition-all text-center gap-2 group"
          >
            <div className="p-2 rounded-full bg-brand-orange/10 text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-colors">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-brand-cream/80 group-hover:text-white">Take Quiz</span>
          </button>
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
                           p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                           ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                           li: ({children}) => <li className="mb-1 [&>p]:mb-0">{children}</li>,
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
                    placeholder="Ask about the book..."
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
