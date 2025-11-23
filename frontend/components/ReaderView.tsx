import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, BookOpen, Type, Minus, Plus, Lightbulb, Sparkles, SkipBack, SkipForward, Bot, X, FileText, AlertTriangle, List, HelpCircle, Send } from 'lucide-react';
import { BookDetails } from '../types';
import { getBookContent, askQuestion, summarizeChapter, generateQuiz } from '../services/backendService';
import ReactMarkdown from 'react-markdown';

interface ReaderViewProps {
  book: BookDetails;
  initialChapterIndex: number;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ book, initialChapterIndex, onClose }) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Appearance State
  const [isNightMode, setIsNightMode] = useState(false);
  const [fontSize, setFontSize] = useState(18);

  // Sidebars State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // AI Chat State
  const [isAiAssistOpen, setIsAiAssistOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'ai', text: "Hello! I'm your literary companion. Feel free to ask me about the characters, themes, or plot of this book." }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      // Scroll to top when changing chapters
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      
      try {
        // Use the real bookId from the book object
        const bookId = (book as any).id;
        if (!bookId) {
          console.error("No bookId available");
          setContent("Book ID not found. Cannot load content.");
          setLoading(false);
          return;
        }
        // Backend expects 1-based chapter index
        const response = await getBookContent(bookId, currentChapterIndex + 1);
        
        if (response.items && response.items.length > 0) {
          // EPUB content is HTML stored in the 'content' field
          const htmlContent = response.items[0].content || response.items.map((item: any) => item.paragraphText).join('\n\n');
          setContent(htmlContent);
        } else {
          setContent("__CONTENT_UNAVAILABLE__");
        }
      } catch (error) {
        console.error("Failed to fetch content", error);
        setContent("__CONTENT_ERROR__");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [book, currentChapterIndex]);

  // Scroll chat to bottom
  useEffect(() => {
    if(isAiAssistOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAiAssistOpen, isAiThinking]);

  const handleNext = () => {
    if (currentChapterIndex < book.chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

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
    
    // Open chat if closed to show summary
    if (!isAiAssistOpen) setIsAiAssistOpen(true);

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
    
    // Open chat if closed to show quiz
    if (!isAiAssistOpen) setIsAiAssistOpen(true);

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
          quizText += `${String.fromCharCode(97 + optIndex)}) ${option}\n`;
        });
        quizText += `\n`;
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
    <div className="fixed inset-0 z-50 bg-[#2a1d18] flex flex-col animate-fade-in">
      <style>{`
        .chapter-content {
          font-style: normal;
        }
        .chapter-content h1:first-child,
        .chapter-content h2:first-child,
        .chapter-content h3:first-child,
        .chapter-content h4:first-child {
          display: none;
        }
        .chapter-content p {
          text-indent: 1em;
        }
        .chapter-content > p:first-of-type {
          text-indent: 0;
        }
        .chapter-content h1 + p,
        .chapter-content h2 + p,
        .chapter-content h3 + p,
        .chapter-content h4 + p,
        .chapter-content h5 + p,
        .chapter-content h6 + p,
        .chapter-content hr + p,
        .chapter-content br + p {
          text-indent: 0;
        }
      `}</style>
      {/* Reader Header */}
      <div className="bg-[#3E2723] shadow-xl px-6 py-3 flex items-center justify-between border-b border-[#A1887F]/20 z-20 relative">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-brand-cream/80 hover:text-brand-orange shrink-0"
            title="Close Reader"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-brand-cream/80 hover:text-brand-orange shrink-0"
            title="Table of Contents"
          >
            <List className="w-6 h-6" />
          </button>

          <div className="flex flex-col truncate">
            <h2 className="text-white font-bold text-lg leading-none tracking-tight truncate">
              {book.title}
            </h2>
            <p className="text-xs text-brand-orange mt-1 font-medium truncate">
              {book.chapters[currentChapterIndex]}
            </p>
          </div>
        </div>

        {/* Right: Toolbar */}
        <div className="flex items-center bg-black/20 rounded-full px-3 py-1.5 gap-3 border border-white/5 backdrop-blur-sm ml-4 shrink-0">
           {/* Font Controls */}
           <div className="flex items-center gap-2 text-brand-cream/80">
              <button 
                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                className="hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <Type className="w-4 h-4" />
              <button 
                onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                className="hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
           </div>

           <div className="w-px h-4 bg-white/10"></div>

           {/* Theme Toggle */}
           <button 
            onClick={() => setIsNightMode(!isNightMode)}
            className={`p-1.5 rounded-full transition-all duration-300 ${
              isNightMode 
                ? 'text-yellow-400 bg-white/10' 
                : 'text-brand-cream/60 hover:text-brand-orange'
            }`}
            title="Toggle Night Light"
          >
            <Lightbulb className={`w-5 h-5 ${isNightMode ? 'fill-current' : ''}`} />
          </button>

          <div className="w-px h-4 bg-white/10"></div>

          {/* AI Assist Toggle */}
          <button 
            onClick={() => setIsAiAssistOpen(!isAiAssistOpen)}
            className={`p-1.5 rounded-full transition-all duration-300 ${
              isAiAssistOpen 
              ? 'text-brand-orange bg-white/10 shadow-[0_0_15px_rgba(243,120,53,0.3)]' 
              : 'text-brand-cream/60 hover:text-brand-orange'
            }`}
            title="AI Assistant"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          <div className="w-px h-4 bg-white/10"></div>

          {/* Chapter Navigation (Top Toolbar) */}
          <div className="flex items-center gap-1">
             <button 
                onClick={handlePrev}
                disabled={loading || currentChapterIndex === 0}
                className="p-1.5 text-brand-cream/60 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                title="Previous Chapter"
             >
                <SkipBack className="w-4 h-4" />
             </button>
             <span className="text-xs font-mono text-brand-cream/40 min-w-[4ch] text-center">
                CH {currentChapterIndex + 1}
             </span>
             <button 
                onClick={handleNext}
                disabled={loading || currentChapterIndex === book.chapters.length - 1}
                className="p-1.5 text-brand-cream/60 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                title="Next Chapter"
             >
                <SkipForward className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto scroll-smooth p-6 md:p-12 relative"
      >
        <div 
          className={`max-w-3xl mx-auto p-8 md:p-16 rounded-sm shadow-2xl min-h-[80vh] transition-colors duration-500 ${
            isNightMode 
              ? 'bg-[#F5E6D3] text-[#4E342E]' // Night Mode ON (Cozy Library Day Mode)
              : 'bg-[#EFEBE9] text-[#3E2723]' // Night Mode OFF (Current Quickbook)
          }`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="w-10 h-10 text-brand-brown animate-spin" />
              <p className="text-brand-brown/70 font-serif italic">Writing content...</p>
            </div>
          ) : content === "__CONTENT_UNAVAILABLE__" || content === "__CONTENT_ERROR__" ? (
            <div className="animate-fade-in font-serif prose max-w-none flex-1">
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
                <div className={`p-4 rounded-full mb-4 ${isNightMode ? 'bg-red-500/10' : 'bg-red-100'}`}>
                  <AlertTriangle className={`w-8 h-8 ${isNightMode ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <h3 className="text-xl font-bold mb-2 opacity-90">
                  {content === "__CONTENT_UNAVAILABLE__" ? "Content Unavailable" : "Failed to Load Content"}
                </h3>
                <p className="max-w-md mx-auto leading-relaxed opacity-70 mb-6">
                  {content === "__CONTENT_UNAVAILABLE__" 
                    ? `We couldn't load the text for this chapter. This is a placeholder error message for demonstration purposes (triggered for "${book.title}").`
                    : "There was an error loading the content. Please check your connection and try again."
                  }
                </p>
                <button 
                  className="px-6 py-2 rounded-full font-bold text-sm transition-colors bg-black/5 hover:bg-black/10 text-black"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in font-serif prose max-w-none flex-1">
              <h2 className="text-3xl font-bold text-brand-darkBrown mb-8 text-center border-b-2 border-brand-brown/20 pb-6">
                {book.chapters[currentChapterIndex]}
              </h2>
              <div className="chapter-content" dangerouslySetInnerHTML={{ __html: content }} />
              <div className="flex justify-center mt-12 text-brand-brown/40">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chapter Navigation Sidebar (Left) */}
      <div className={`absolute top-0 left-0 h-full w-full md:w-80 bg-[#1a110e]/95 backdrop-blur-xl border-r border-[#A1887F]/20 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Header */}
          <div className="p-5 border-b border-[#A1887F]/20 flex items-center justify-between bg-[#2a1d18]/50">
              <div className="flex items-center gap-2">
                  <div className="bg-brand-brown p-2 rounded-lg">
                      <List className="w-5 h-5 text-brand-orange" />
                  </div>
                  <h3 className="text-white font-bold text-lg">Chapters</h3>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-brand-cream/40 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
              </button>
          </div>
          {/* Chapter List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {book.chapters.map((chapter, index) => (
                  <button
                      key={index}
                      onClick={() => {
                          setCurrentChapterIndex(index);
                          setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl transition-all border group relative overflow-hidden ${
                          currentChapterIndex === index
                              ? 'bg-brand-orange text-white border-brand-orange shadow-lg'
                              : 'bg-white/5 text-brand-cream/70 border-transparent hover:bg-white/10 hover:text-white'
                      }`}
                  >
                      <div className="flex items-start gap-3 relative z-10">
                          <span className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-md ${
                              currentChapterIndex === index ? 'bg-white/20 text-white' : 'bg-black/20 text-brand-cream/40'
                          }`}>
                              {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="font-medium text-sm leading-relaxed">{chapter}</span>
                      </div>
                  </button>
              ))}
          </div>
      </div>

      {/* AI Assist Sidebar */}
      <div className={`absolute top-0 right-0 h-full w-full md:w-96 bg-[#1a110e]/95 backdrop-blur-xl border-l border-[#A1887F]/20 shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${isAiAssistOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Sidebar Header */}
          <div className="p-5 border-b border-[#A1887F]/20 flex items-center justify-between bg-[#2a1d18]/50">
              <div className="flex items-center gap-2">
                  <div className="bg-brand-orange/20 p-2 rounded-lg">
                      <Bot className="w-5 h-5 text-brand-orange" />
                  </div>
                  <div>
                      <h3 className="text-white font-bold text-lg">AI Companion</h3>
                      <p className="text-xs text-brand-cream/50">Always here to help</p>
                  </div>
              </div>
              <button onClick={() => setIsAiAssistOpen(false)} className="text-brand-cream/40 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
              </button>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b border-[#A1887F]/20 bg-[#2a1d18]/30 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSendChat(undefined, "Please summarize this chapter.")}
              disabled={isAiThinking}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-orange/30 transition-all text-center gap-2 group"
            >
              <div className="p-2 rounded-full bg-brand-orange/10 text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-brand-cream/80 group-hover:text-white">Summarize</span>
            </button>

            <button
              onClick={() => handleSendChat(undefined, "Give me a short quiz for this chapter.")}
              disabled={isAiThinking}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-orange/30 transition-all text-center gap-2 group"
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
                             ul: ({children}) => <ul className="list-disc ml-4 mb-2 space-y-0.5">{children}</ul>,
                             li: ({children}) => <li>{children}</li>,
                             h1: ({children}) => <h1 className="text-base font-bold mb-2 text-brand-orange">{children}</h1>,
                             h2: ({children}) => <h2 className="text-base font-bold mb-1.5 text-brand-orange">{children}</h2>,
                             h3: ({children}) => <h3 className="text-sm font-bold mb-1 text-brand-orange">{children}</h3>,
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

      {/* Footer Navigation */}
      <div className="bg-[#3E2723] p-4 border-t border-[#A1887F]/20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button 
            onClick={handlePrev}
            disabled={currentChapterIndex === 0 || loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentChapterIndex === 0 || loading
                ? 'text-white/20 cursor-not-allowed' 
                : 'text-brand-cream hover:bg-white/10 hover:text-brand-orange'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <span className="text-sm text-brand-lightBrown font-medium">
            {currentChapterIndex + 1} / {book.chapters.length}
          </span>

          <button 
            onClick={handleNext}
            disabled={currentChapterIndex === book.chapters.length - 1 || loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentChapterIndex === book.chapters.length - 1 || loading
                ? 'text-white/20 cursor-not-allowed' 
                : 'text-brand-cream hover:bg-white/10 hover:text-brand-orange'
            }`}
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
