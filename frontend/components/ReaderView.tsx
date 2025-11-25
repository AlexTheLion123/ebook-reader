import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Type, Minus, Plus, Lightbulb, SkipBack, SkipForward, Sparkles, X, AlertTriangle, List, BookOpen, Settings } from 'lucide-react';
import { BookDetails } from '../types';
import { getBookContent } from '../services/backendService';
import { AIAssistSidebar } from './AIAssistSidebar';

interface ReaderViewProps {
  book: BookDetails;
  initialChapterIndex: number;
  onClose: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ book, initialChapterIndex, onClose }) => {
  // Content State
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Appearance State
  const [isNightMode, setIsNightMode] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Navigation Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSettingsOpen &&
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Sidebars State
  const [isAiAssistOpen, setIsAiAssistOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- 1. Fetch Chapter Content ---
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      
      try {
        // Use the real bookId from the book object
        const bookId = (book as any).id;
        if (!bookId) {
          console.error("No bookId available");
          setContent(""); // Empty content triggers the error view
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
          setContent(""); // Empty content triggers the error view
        }
      } catch (error) {
        console.error("Failed to fetch content", error);
        setContent(""); // Empty content triggers the error view
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [book, currentChapterIndex]);


  // --- Navigation Handlers ---

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
      {/* Header */}
      <div className="bg-[#3E2723] shadow-xl px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between border-b border-[#A1887F]/20 z-20 relative">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-1 overflow-hidden">
          <button 
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors text-brand-cream/80 hover:text-brand-orange shrink-0"
            title="Close Reader"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors text-brand-cream/80 hover:text-brand-orange shrink-0"
            title="Table of Contents"
          >
            <List className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex flex-col truncate ml-1">
            <h2 className="text-white font-bold text-base sm:text-lg leading-none tracking-tight truncate">
              {book.title}
            </h2>
            <p className="text-xs text-brand-lightBrown mt-1 font-medium truncate">
              Chapter {currentChapterIndex + 1}: {book.chapters[currentChapterIndex]}
            </p>
          </div>
        </div>

        {/* Right: Toolbar */}
        <div className="flex items-center bg-black/20 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 gap-2.5 sm:gap-3 border border-white/5 backdrop-blur-sm ml-3 sm:ml-4 shrink-0 relative">
           {/* Desktop Controls (Hidden on Mobile) */}
           <div className="hidden sm:flex items-center gap-3">
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
          </div>

          {/* Mobile Settings Toggle */}
          <button 
            ref={settingsButtonRef}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`sm:hidden p-1.5 rounded-full transition-all duration-300 ${
              isSettingsOpen 
                ? 'text-brand-orange bg-white/10' 
                : 'text-brand-cream/60 hover:text-brand-orange'
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="sm:hidden w-px h-4 bg-white/10"></div>

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
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="hidden sm:block w-px h-4 bg-white/10"></div>

          {/* Chapter Navigation (Top Toolbar) */}
          <div className="hidden sm:flex items-center gap-1">
             <button 
                onClick={handlePrev}
                disabled={loading || currentChapterIndex === 0}
                className="p-1.5 text-brand-cream/60 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                title="Previous Chapter"
             >
                <SkipBack className="w-4 h-4" />
             </button>
             <span className="text-xs font-mono text-brand-cream/40 min-w-[4ch] text-center hidden sm:inline-block">
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

          {/* Mobile Settings Dropdown */}
          {isSettingsOpen && (
            <div ref={settingsRef} className="absolute top-full right-0 mt-2 w-48 bg-[#3E2723] border border-[#A1887F]/20 rounded-xl shadow-2xl p-4 flex flex-col gap-4 animate-[fade-in_0.18s_ease-out] z-50 sm:hidden">
              {/* Font Controls */}
              <div className="flex items-center justify-between text-brand-cream/80">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-cream/50">Size</span>
                <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
                  <button 
                    onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                    className="hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-mono w-6 text-center">{fontSize}</span>
                  <button 
                    onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                    className="hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/10"></div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between text-brand-cream/80">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-cream/50">Theme</span>
                <button 
                  onClick={() => setIsNightMode(!isNightMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                    isNightMode 
                      ? 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30' 
                      : 'bg-white/5 text-brand-cream/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Lightbulb className={`w-4 h-4 ${isNightMode ? 'fill-current' : ''}`} />
                  <span className="text-xs font-bold">{isNightMode ? 'Night' : 'Day'}</span>
                </button>
              </div>
            </div>
          )}
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
          ) : !content ? (
            <div className="animate-fade-in font-serif prose max-w-none flex-1">
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
                <div className={`p-4 rounded-full mb-4 ${isNightMode ? 'bg-red-500/10' : 'bg-red-100'}`}>
                  <AlertTriangle className={`w-8 h-8 ${isNightMode ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 opacity-90">
                  Content Unavailable
                </h3>
                <p className="text-sm sm:text-base max-w-md mx-auto leading-relaxed opacity-70 mb-6">
                  We couldn't load the text for this chapter. Please check your connection and try again.
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
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-darkBrown mb-8 text-center border-b-2 border-brand-brown/20 pb-6">
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

      {/* AI Assist Sidebar (Right) */}
      <AIAssistSidebar 
        isOpen={isAiAssistOpen}
        onClose={() => setIsAiAssistOpen(false)}
        book={book}
        currentChapterIndex={currentChapterIndex}
      />

      {/* Footer Navigation */}
      <div className="bg-[#3E2723] p-3 sm:p-4 border-t border-[#A1887F]/20">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <button 
            onClick={handlePrev}
            disabled={currentChapterIndex === 0 || loading}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              currentChapterIndex === 0 || loading
                ? 'text-white/20 cursor-not-allowed' 
                : 'text-brand-cream hover:bg-white/10 hover:text-brand-orange'
            }`}
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            Previous
          </button>

          <span className="text-xs sm:text-sm text-brand-lightBrown font-medium">
            {currentChapterIndex + 1} / {book.chapters.length}
          </span>

          <button 
            onClick={handleNext}
            disabled={currentChapterIndex === book.chapters.length - 1 || loading}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              currentChapterIndex === book.chapters.length - 1 || loading
                ? 'text-white/20 cursor-not-allowed' 
                : 'text-brand-cream hover:bg-white/10 hover:text-brand-orange'
            }`}
          >
            Next
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};