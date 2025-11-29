import React, { useState } from 'react';
import { ArrowLeft, Star, BookOpen, ChevronDown, ChevronUp, List, PlayCircle, BrainCircuit, BarChart2, RefreshCw, Zap, TrendingUp, Activity } from 'lucide-react';
import { BookDetails, BookProgress } from '../types';

interface BookDetailProps {
  book: BookDetails;
  progress?: BookProgress | null;
  onBack: () => void;
  onRead: (chapterIndex: number) => void;
  onTest: () => void;
}

export const BookDetail: React.FC<BookDetailProps> = ({ book, progress, onBack, onRead, onTest }) => {
  const [isChaptersOpen, setIsChaptersOpen] = useState(true);
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);

  // Helper for concept color
  const getConceptColor = (score: number) => {
    if (score >= 80) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (score >= 50) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  const getMasteryColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    return 'text-brand-orange';
  };
  
  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    return 'bg-brand-orange';
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-20">
      
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center text-brand-cream/80 hover:text-brand-orange transition-colors mb-4 md:mb-6 text-sm md:text-base font-medium group"
      >
        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Search
      </button>

      {/* Main Card */}
      <div className="bg-[#3E2723]/90 backdrop-blur-lg border border-[#A1887F]/30 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 md:p-10 border-b border-[#A1887F]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 hidden md:block">
            <BookOpen className="w-40 h-40 text-white" />
          </div>
          
          <div className="relative z-10">
            {/* <div className="flex flex-wrap gap-3 mb-4">
              <span className="bg-brand-orange/90 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center">
                Recommended Read
              </span>
              <div className="flex items-center bg-black/40 px-3 py-1 rounded-full border border-white/10">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 mr-1.5" />
                <span className="text-sm font-bold text-white">{book.rating}/5.0</span>
              </div>
            </div> */}
            
            <h1 className="text-2xl md:text-5xl font-extrabold text-white mb-1 md:mb-2 leading-tight tracking-tight">
              {book.title}
            </h1>
            <p className="text-base md:text-2xl text-brand-lightBrown font-serif italic mb-4 md:mb-8">
              by {book.author}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <button 
                onClick={() => onRead(0)}
                className="flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-darkOrange text-white text-sm md:text-base font-bold py-2.5 px-6 md:py-3 md:px-8 rounded-full shadow-lg shadow-brand-orange/30 transition-all hover:scale-105 hover:shadow-xl w-full sm:w-auto"
              >
                <PlayCircle className="w-5 h-5 fill-current" />
                Start Reading
              </button>

              <button 
                onClick={onTest}
                className="flex items-center justify-center gap-2 bg-[#5D4037] hover:bg-[#6D4C41] border border-[#A1887F]/30 text-white text-sm md:text-base font-bold py-2.5 px-6 md:py-3 md:px-6 rounded-full shadow-lg transition-all hover:scale-105 hover:border-brand-orange/50 group w-full sm:w-auto"
              >
                <BrainCircuit className="w-5 h-5 text-brand-orange group-hover:text-white transition-colors" />
                Test Yourself
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-10">
          
          {/* Synopsis */}
          <div className="mb-6 md:mb-10">
            <h3 className="text-base md:text-lg font-bold text-brand-orange mb-2 md:mb-3 uppercase tracking-wide">Synopsis</h3>
            <p className="text-base md:text-lg text-brand-cream/90 leading-relaxed font-light">
              {book.longDescription}
            </p>
          </div>

          {/* PROGRESS DASHBOARD SECTION */}
          {progress && (
             <div className="mb-6 md:mb-10 bg-[#1a110e]/80 rounded-2xl border border-white/5 overflow-hidden relative shadow-2xl transition-all duration-300">
                
                {/* Header Row - Clickable Toggle */}
                <div 
                  className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group gap-4 md:gap-0"
                  onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                >
                   {/* Top/Left Section: Chevron + Title */}
                   <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                      <div className={`shrink-0 transition-colors ${isProgressExpanded ? 'text-white' : 'text-brand-cream/40 group-hover:text-white'}`}>
                        {isProgressExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                      </div>

                      <div className="flex items-center gap-3">
                         <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-brand-orange shrink-0" />
                         <div>
                           <h3 className="text-lg md:text-xl font-bold text-white">
                             Your Progress
                           </h3>
                           <p className="text-xs md:text-sm text-brand-cream/60">Track your mastery of themes, symbols, and chapters.</p>
                         </div>
                      </div>
                   </div>
                   
                   {/* Bottom/Right Section: Mastery Badge - HIDDEN ON MOBILE */}
                   <div className="hidden md:block w-auto">
                      <div className="relative overflow-hidden flex items-center justify-start gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 transition-transform group-hover:scale-105 w-auto">
                          <div className="text-right z-10">
                            <div className={`text-2xl font-extrabold leading-none ${getMasteryColor(progress.overallMastery)}`}>
                                {progress.overallMastery}%
                            </div>
                            <div className="text-[9px] font-bold text-brand-cream/40 uppercase tracking-widest mt-0.5">Mastery</div>
                          </div>
                          <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 ${progress.overallMastery >= 80 ? 'border-green-500' : 'border-brand-orange'}`}>
                            <TrendingUp className={`w-4 h-4 ${progress.overallMastery >= 80 ? 'text-green-500' : 'text-brand-orange'}`} />
                          </div>
                      </div>
                   </div>
                </div>

                {/* Collapsible Content */}
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isProgressExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  
                  {/* Mobile Badge Section (Moved from Header) */}
                  <div className="md:hidden px-5 pt-2 pb-2">
                     <div className="relative overflow-hidden flex items-center justify-between gap-3 bg-black/40 px-4 py-3 rounded-xl border border-white/5 w-full">
                        <div className="text-left z-10">
                          <div className={`text-xl font-extrabold leading-none ${getMasteryColor(progress.overallMastery)}`}>
                              {progress.overallMastery}%
                          </div>
                          <div className="text-[9px] font-bold text-brand-cream/40 uppercase tracking-widest mt-0.5">Mastery</div>
                        </div>
                        <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 ${progress.overallMastery >= 80 ? 'border-green-500' : 'border-brand-orange'}`}>
                          <TrendingUp className={`w-4 h-4 ${progress.overallMastery >= 80 ? 'text-green-500' : 'text-brand-orange'}`} />
                        </div>
                        {/* Mobile Integrated Progress Bar */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                            <div 
                              className={`h-full ${getProgressBarColor(progress.overallMastery)}`} 
                              style={{ width: `${progress.overallMastery}%` }}
                            />
                        </div>
                     </div>
                  </div>

                  {/* Desktop Progress Bar (Hidden on Mobile) */}
                  <div className="px-6 pb-2 hidden md:block">
                    <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                        <div 
                          className="h-full bg-gradient-to-r from-brand-orange to-red-500 rounded-full shadow-[0_0_15px_rgba(243,120,53,0.4)]"
                          style={{ width: `${progress.overallMastery}%` }}
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
                          {progress.concepts.map((concept) => (
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
                              {progress.chapterBreakdown.map((chap) => {
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
                        onClick={(e) => { e.stopPropagation(); onTest(); }}
                        className="flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-darkOrange text-white text-sm sm:text-base font-bold py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl shadow-lg shadow-brand-orange/20 transition-all hover:-translate-y-0.5"
                      >
                          <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                          Continue Test
                      </button>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onTest(); }}
                        className="flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-brand-cream/80 text-sm sm:text-base font-bold py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl border border-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5"
                      >
                          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 opacity-60" />
                          Review Weak Areas
                      </button>
                  </div>
                </div>
             </div>
          )}

          {/* Chapters Dropdown */}
          <div className="border border-[#A1887F]/30 rounded-xl bg-black/20 overflow-hidden transition-all duration-300">
            <button 
              onClick={() => setIsChaptersOpen(!isChaptersOpen)}
              className="w-full flex items-center justify-between p-3 md:p-5 hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-brand-brown p-2 rounded-lg">
                  <List className="w-5 h-5 text-brand-orange" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Table of Contents</h3>
                  <p className="text-xs text-brand-cream/60 font-medium">
                    {book.chapters.length} Chapters Available
                  </p>
                </div>
              </div>
              {isChaptersOpen ? (
                <ChevronUp className="w-6 h-6 text-brand-cream/70" />
              ) : (
                <ChevronDown className="w-6 h-6 text-brand-cream/70" />
              )}
            </button>

            {/* Dropdown Content */}
            <div 
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                isChaptersOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-3 md:p-5 pt-0 border-t border-white/5">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-3 mt-2 md:mt-4">
                  {book.chapters.map((chapter, index) => (
                    <li 
                      key={index}
                    >
                      <button
                        onClick={() => onRead(index)}
                        className="w-full flex items-center p-2 md:p-3 rounded-lg hover:bg-white/10 hover:translate-x-1 transition-all border border-transparent hover:border-white/5 group text-left"
                      >
                        <span className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-brand-brown/50 rounded-full text-xs font-bold text-brand-orange mr-2 md:mr-3 shrink-0 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                          {index + 1}
                        </span>
                        <span className="text-brand-cream/90 text-sm font-medium truncate group-hover:text-white">
                          {chapter}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};