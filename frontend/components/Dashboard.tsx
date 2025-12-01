import React, { useState } from 'react';
import { ArrowLeft, Trophy, Flame, Target, BookOpen, BrainCircuit, List, Zap, ChevronUp, ChevronDown, ChevronsDown, ChevronsUp, Loader2, Settings, PlayCircle } from 'lucide-react';
import { BookProgress } from '../types';

interface DashboardProps {
  progressData: BookProgress[];
  loading?: boolean;
  onBack: () => void;
  onContinue: (bookTitle: string) => void;
  /** Handler for instant start (one-tap quiz) */
  onInstantStart?: (bookTitle: string) => void;
  /** Handler to open full test setup modal */
  onOpenTestSetup?: (bookTitle: string) => void;
  /** Handler for continue reading */
  onRead?: (bookTitle: string) => void;
}

interface ProgressCardProps {
  book: BookProgress;
  onContinue: (title: string) => void;
  onInstantStart?: (title: string) => void;
  onOpenTestSetup?: (title: string) => void;
  onRead?: (title: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

// Collapsible Progress Card Component
const ProgressCard: React.FC<ProgressCardProps> = ({ book, onContinue, onInstantStart, onOpenTestSetup, onRead, isExpanded, onToggle }) => {
  
  // Helper for concept color
  const getConceptColor = (score: number) => {
    if (score >= 80) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (score >= 50) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  // Greyish Mastery Badge Style (subtle, not primary)
  const getMasteryStyle = (percentage: number) => {
    // Use a subtle grey/slate tone instead of red/orange
    let bgOpacity = 0.15;
    let borderOpacity = 0.2;
    
    if (percentage >= 90) { 
      bgOpacity = 0.25; 
      borderOpacity = 0.4; 
    } else if (percentage >= 70) { 
      bgOpacity = 0.20; 
      borderOpacity = 0.3;
    } else if (percentage >= 40) { 
      bgOpacity = 0.18; 
    }

    return {
      backgroundColor: `rgba(200, 200, 210, ${bgOpacity})`,
      border: `1px solid rgba(200, 200, 210, ${borderOpacity})`,
      color: 'rgba(220, 220, 230, 0.9)',
      backdropFilter: 'blur(6px)',
    };
  };

  const handleInstantTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInstantStart ? onInstantStart(book.bookTitle) : onContinue(book.bookTitle);
  };

  const handleCustomize = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenTestSetup ? onOpenTestSetup(book.bookTitle) : onContinue(book.bookTitle);
  };

  const handleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRead ? onRead(book.bookTitle) : onContinue(book.bookTitle);
  };

  return (
    <div className="bg-[#1a110e]/80 rounded-2xl border border-white/5 overflow-hidden relative shadow-2xl animate-slide-up transition-all duration-300 group">
      
      {/* Header Row - Clickable Toggle */}
      <div 
        className="p-5 md:p-6 flex flex-col md:flex-row md:items-start justify-between cursor-pointer hover:bg-white/5 transition-colors gap-4 md:gap-0"
        onClick={onToggle}
      >
          {/* Top/Left Section: Chevron + Title/Info */}
          <div className="flex items-start gap-3 md:gap-4 w-full md:w-auto">
             <div className={`mt-1 md:mt-1.5 shrink-0 transition-colors ${isExpanded ? 'text-white' : 'text-brand-cream/40 group-hover:text-white'}`}>
               {isExpanded ? <ChevronUp className="w-5 h-5 md:w-6 md:h-6" /> : <ChevronDown className="w-5 h-5 md:w-6 md:h-6" />}
             </div>

             <div className="flex-1 min-w-0">
                <h3 className="text-xl md:text-2xl font-bold text-white flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                  <span className="break-words leading-tight">{book.bookTitle}</span>
                </h3>
                {isExpanded && (
                  <p className="text-xs md:text-sm text-brand-cream/60 animate-fade-in mb-2">Last tested: {book.lastTestedDate}</p>
                )}
             </div>
          </div>
          
          {/* Mastery Badge - Greyish pill style */}
          <div className="w-auto self-start">
            <div 
              className="flex items-center justify-center min-w-[56px] h-[30px] px-2.5 rounded-full font-bold text-sm transition-all shadow-lg"
              style={getMasteryStyle(book.overallMastery)}
            >
              {book.overallMastery}% Mastery
            </div>
          </div>
      </div>

      {/* Collapsible Content */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
          
          <div className="px-6 md:px-20 pb-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Left Col: Concept Mastery */}
            <div>
                <h4 className="text-xs font-bold text-brand-cream/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> Concept Mastery
                </h4>
                <div className="flex flex-wrap gap-2">
                  {book.concepts.map((concept) => (
                      <div 
                        key={concept.name}
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-default bg-black/20 ${getConceptColor(concept.score)}`}
                      >
                        <span>{concept.name}</span>
                        <span>{concept.score}%</span>
                      </div>
                  ))}
                </div>
            </div>

            {/* Right Col: Chapter Map */}
            <div>
                <h4 className="text-xs font-bold text-brand-cream/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <List className="w-4 h-4" /> Chapter Map
                </h4>
                <div className="flex flex-wrap gap-1.5">
                    {book.chapterBreakdown.map((chap) => {
                      let color = 'bg-white/5'; // Untouched
                      if (chap.status === 'MASTERED') color = 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
                      if (chap.status === 'IN_PROGRESS') color = 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]';
                      
                      return (
                          <div 
                            key={chap.chapterIndex}
                            className={`w-3 h-3 md:w-4 md:h-4 rounded-[2px] transition-all cursor-help ${color}`}
                            title={`Chapter ${chap.chapterIndex + 1}: ${chap.status.replace('_', ' ')}`}
                          ></div>
                      );
                    })}
                </div>
            </div>
          </div>

          {/* Smart Action Bar - Clean horizontal bar like cozy-library */}
          <div className="p-4 md:p-6 bg-black/20 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
             <div className="flex items-center gap-3 flex-1 md:flex-none">
                 <button 
                   onClick={handleRead}
                   className="flex-1 md:flex-none bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all hover:scale-[1.02] text-sm flex items-center justify-center gap-2 border border-white/5"
                 >
                    <PlayCircle className="w-4 h-4 fill-current text-brand-cream" />
                    <span className="hidden sm:inline">Continue Reading</span>
                    <span className="sm:hidden">Read</span>
                 </button>

                 <button 
                   onClick={handleInstantTest}
                   className="flex-1 md:flex-none bg-brand-orange hover:bg-brand-darkOrange text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-brand-orange/20 transition-all hover:scale-[1.02] text-sm flex items-center justify-center gap-2"
                 >
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="hidden sm:inline">{book.overallMastery === 0 ? 'Test Yourself' : 'Continue Test'}</span>
                    <span className="sm:hidden">Test</span>
                 </button>
             </div>

             <button 
                onClick={handleCustomize}
                className="p-3 rounded-full text-brand-cream/60 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/5"
                title="Customize Session"
             >
                <Settings className="w-5 h-5" />
             </button>
          </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ progressData, loading, onBack, onContinue, onInstantStart, onOpenTestSetup, onRead }) => {
  // Show loading state while fetching active books
  if (loading) {
    return (
      <div className="animate-fade-in max-w-6xl mx-auto pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-brand-cream/80 hover:text-brand-orange transition-colors font-medium group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Library
          </button>
          <h1 className="text-2xl font-bold text-white hidden md:block">My Learning Dashboard</h1>
        </div>

        {/* Loading State */}
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand-orange animate-spin mb-4" />
          <p className="text-brand-cream/60 text-lg">Loading your courses...</p>
        </div>
      </div>
    );
  }

  // Calculate aggregate stats
  const totalBooks = progressData.length;
  const averageMastery = Math.round(progressData.reduce((acc, curr) => acc + curr.overallMastery, 0) / (totalBooks || 1));
  const totalMasteredChapters = progressData.reduce((acc, curr) => acc + curr.chaptersMastered, 0);

  // Sort data by last tested date (most recent first)
  const sortedData = [...progressData].sort((a, b) => new Date(b.lastTestedDate).getTime() - new Date(a.lastTestedDate).getTime());

  // State for expanded cards (Tracked by Book Title)
  // Default: All collapsed
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());

  const toggleBook = (title: string) => {
    const next = new Set(expandedBooks);
    if (next.has(title)) {
      next.delete(title);
    } else {
      next.add(title);
    }
    setExpandedBooks(next);
  };

  const handleExpandAll = () => {
    const allTitles = progressData.map(b => b.bookTitle);
    setExpandedBooks(new Set(allTitles));
  };

  const handleCollapseAll = () => {
    setExpandedBooks(new Set());
  };

  const areAllExpanded = progressData.length > 0 && expandedBooks.size === progressData.length;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center text-brand-cream/80 hover:text-brand-orange transition-colors font-medium group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Library
        </button>
        <h1 className="text-2xl font-bold text-white hidden md:block">My Learning Dashboard</h1>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-10">
        <div className="bg-[#3E2723]/90 backdrop-blur-lg border border-[#A1887F]/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 shadow-lg hover:shadow-xl transition-shadow">
          <div className="hidden sm:block bg-brand-orange/20 p-2 rounded-full">
            <Flame className="w-5 h-5 text-brand-orange" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-brand-cream/60 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Avg. Mastery</p>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">{averageMastery}%</h3>
          </div>
        </div>

        <div className="bg-[#3E2723]/90 backdrop-blur-lg border border-[#A1887F]/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 shadow-lg hover:shadow-xl transition-shadow">
          <div className="hidden sm:block bg-blue-500/20 p-2 rounded-full">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-brand-cream/60 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Books Active</p>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">{totalBooks}</h3>
          </div>
        </div>

        <div className="bg-[#3E2723]/90 backdrop-blur-lg border border-[#A1887F]/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 shadow-lg hover:shadow-xl transition-shadow">
          <div className="hidden sm:block bg-green-500/20 p-2 rounded-full">
            <Trophy className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-brand-cream/60 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Chapters Aced</p>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">{totalMasteredChapters}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-orange" />
            Active Courses
          </h2>
          
          {/* Expand/Collapse All Button */}
          {progressData.length > 0 && (
            <button 
              onClick={areAllExpanded ? handleCollapseAll : handleExpandAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-orange hover:bg-white/5 hover:text-white transition-all uppercase tracking-wider border border-transparent hover:border-white/10"
            >
              {areAllExpanded ? (
                <>
                  <ChevronsUp className="w-4 h-4" /> Collapse All
                </>
              ) : (
                <>
                  <ChevronsDown className="w-4 h-4" /> Expand All
                </>
              )}
            </button>
          )}
        </div>

        {/* Empty State */}
        {progressData.length === 0 ? (
          <div className="bg-[#1a110e]/80 rounded-2xl border border-white/5 p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-orange/10 mb-4">
              <BookOpen className="w-8 h-8 text-brand-orange" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Active Courses Yet</h3>
            <p className="text-brand-cream/60 mb-6 max-w-md mx-auto">
              Start learning by clicking "Test Yourself" on any book. It will automatically be added to your active courses.
            </p>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-darkOrange text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-brand-orange/20 transition-all hover:scale-105"
            >
              <BookOpen className="w-5 h-5" />
              Browse Library
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {sortedData.map((book, idx) => (
               <ProgressCard 
                  key={idx} 
                  book={book} 
                  onContinue={onContinue}
                  onInstantStart={onInstantStart}
                  onOpenTestSetup={onOpenTestSetup}
                  onRead={onRead}
                  isExpanded={expandedBooks.has(book.bookTitle)}
                  onToggle={() => toggleBook(book.bookTitle)}
               />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
