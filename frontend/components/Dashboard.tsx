import React, { useState } from 'react';
import { ArrowLeft, Trophy, Flame, Target, BookOpen, TrendingUp, BrainCircuit, List, Zap, RefreshCw, ChevronUp, ChevronDown, ChevronsDown, ChevronsUp } from 'lucide-react';
import { BookProgress } from '../types';

interface DashboardProps {
  progressData: BookProgress[];
  onBack: () => void;
  onContinue: (bookTitle: string) => void;
}

interface ProgressCardProps {
  book: BookProgress;
  onContinue: (title: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

// Collapsible Progress Card Component
const ProgressCard: React.FC<ProgressCardProps> = ({ book, onContinue, isExpanded, onToggle }) => {
  
  // Helper for concept color
  const getConceptColor = (score: number) => {
    if (score >= 80) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (score >= 50) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  const getMasteryColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-brand-orange';
    return 'text-red-400';
  };
  
  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-brand-orange';
    return 'bg-red-500';
  };

  return (
    <div className="bg-[#1a110e]/80 rounded-2xl border border-white/5 overflow-hidden relative shadow-2xl animate-slide-up transition-all duration-300">
      
      {/* Header Row - Clickable Toggle */}
      <div 
        className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group gap-4 md:gap-0"
        onClick={onToggle}
      >
          {/* Top/Left Section: Chevron + Title/Info */}
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
             <div className={`shrink-0 transition-colors ${isExpanded ? 'text-white' : 'text-brand-cream/40 group-hover:text-white'}`}>
               {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
             </div>

             <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-brand-orange shrink-0" />
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-white">
                    {book.bookTitle}
                  </h3>
                  <p className="text-xs md:text-sm text-brand-cream/60">Last tested: {book.lastTestedDate}</p>
                </div>
             </div>
          </div>
          
          {/* Bottom/Right Section: Mastery Badge - HIDDEN ON MOBILE */}
          <div className="hidden md:block w-auto">
            <div className="relative overflow-hidden flex items-center justify-start gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 transition-transform group-hover:scale-105 w-auto">
                <div className="text-right z-10">
                  <div className={`text-2xl font-extrabold leading-none ${getMasteryColor(book.overallMastery)}`}>
                      {book.overallMastery}%
                  </div>
                  <div className="text-[9px] font-bold text-brand-cream/40 uppercase tracking-widest mt-0.5">Mastery</div>
                </div>
                <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 ${book.overallMastery >= 50 ? 'border-brand-orange' : 'border-red-500/50'}`}>
                  <TrendingUp className={`w-4 h-4 ${book.overallMastery >= 50 ? 'text-brand-orange' : 'text-red-400'}`} />
                </div>
            </div>
          </div>
      </div>

      {/* Collapsible Content */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          
          {/* Mobile Badge Section (Moved from Header) */}
          <div className="md:hidden px-5 pt-2 pb-2">
             <div className="relative overflow-hidden flex items-center justify-between gap-3 bg-black/40 px-4 py-3 rounded-xl border border-white/5 w-full">
                <div className="text-left z-10">
                  <div className={`text-xl font-extrabold leading-none ${getMasteryColor(book.overallMastery)}`}>
                      {book.overallMastery}%
                  </div>
                  <div className="text-[9px] font-bold text-brand-cream/40 uppercase tracking-widest mt-0.5">Mastery</div>
                </div>
                <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 ${book.overallMastery >= 50 ? 'border-brand-orange' : 'border-red-500/50'}`}>
                  <TrendingUp className={`w-4 h-4 ${book.overallMastery >= 50 ? 'text-brand-orange' : 'text-red-400'}`} />
                </div>
                {/* Mobile Integrated Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                    <div 
                      className={`h-full ${getProgressBarColor(book.overallMastery)}`} 
                      style={{ width: `${book.overallMastery}%` }}
                    />
                </div>
             </div>
          </div>

          {/* Desktop Progress Bar (Hidden on Mobile) */}
          <div className="px-6 pb-2 hidden md:block">
            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                <div 
                  className="h-full bg-gradient-to-r from-brand-orange to-red-500 rounded-full shadow-[0_0_15px_rgba(243,120,53,0.4)]"
                  style={{ width: `${book.overallMastery}%` }}
                />
            </div>
          </div>

          <div className="p-4 sm:p-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Col: Concept Mastery */}
            <div>
                <h4 className="text-xs font-bold text-brand-cream/40 uppercase tracking-widest mb-2 md:mb-4 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> Concept Mastery
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  {book.concepts.map((concept) => (
                      <div 
                        key={concept.name}
                        className={`px-3 py-2.5 rounded-lg border text-sm flex items-center justify-between transition-all hover:scale-[1.02] cursor-default bg-black/20 ${getConceptColor(concept.score)}`}
                      >
                        <span className="font-medium">{concept.name}</span>
                        <span className="font-bold">{concept.score}%</span>
                      </div>
                  ))}
                </div>
            </div>

            {/* Right Col: Chapter Map */}
            <div>
                <h4 className="text-xs font-bold text-brand-cream/40 uppercase tracking-widest mb-2 md:mb-4 flex items-center gap-2">
                  <List className="w-4 h-4" /> Chapter Map
                </h4>
                <div className="bg-black/40 p-4 md:p-5 rounded-xl border border-white/5">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                      {book.chapterBreakdown.map((chap) => {
                        let color = 'bg-white/5 hover:bg-white/10'; // Untouched
                        if (chap.status === 'MASTERED') color = 'bg-green-500 hover:bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.3)]';
                        if (chap.status === 'IN_PROGRESS') color = 'bg-yellow-500 hover:bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.3)]';
                        
                        return (
                            <div 
                              key={chap.chapterIndex}
                              className={`w-3 h-3 md:w-4 md:h-4 rounded-[2px] transition-all cursor-help ${color}`}
                              title={`Chapter ${chap.chapterIndex + 1}: ${chap.status.replace('_', ' ')}`}
                            ></div>
                        );
                      })}
                  </div>
                  <div className="flex gap-4 text-[9px] text-brand-cream/40 uppercase font-bold tracking-wider">
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-[1px]"></div> Mastered</span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-yellow-500 rounded-[1px]"></div> In Progress</span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-white/10 rounded-[1px]"></div> Untouched</span>
                  </div>
                </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); onContinue(book.bookTitle); }}
                className="flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-darkOrange text-white text-sm sm:text-base font-bold py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl shadow-lg shadow-brand-orange/20 transition-all hover:-translate-y-0.5"
              >
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                  Resume Course
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onContinue(book.bookTitle); }}
                className="flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-brand-cream/80 text-sm sm:text-base font-bold py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl border border-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5"
              >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 opacity-60" />
                  Review Weak Areas
              </button>
          </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ progressData, onBack, onContinue }) => {
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
        </div>

        <div className="grid grid-cols-1 gap-6">
          {sortedData.map((book, idx) => (
             <ProgressCard 
                key={idx} 
                book={book} 
                onContinue={onContinue} 
                isExpanded={expandedBooks.has(book.bookTitle)}
                onToggle={() => toggleBook(book.bookTitle)}
             />
          ))}
        </div>
      </div>
    </div>
  );
};
