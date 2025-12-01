import React, { useState, useCallback } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, List, PlayCircle, BrainCircuit, CheckCircle, Loader2, Settings } from 'lucide-react';
import { BookDetails, BookProgress } from '../types';
import { isBookActive, addActiveBook, removeActiveBook } from '../services/userActiveBooksService';

interface BookDetailProps {
  book: BookDetails;
  progress?: BookProgress | null;
  loadingProgress?: boolean;
  onBack: () => void;
  onRead: (chapterIndex: number) => void;
  onTest: () => void;
  /** Handler for instant start (one-tap, smart defaults) */
  onInstantStart?: () => void;
  /** Handler to open full test setup modal (gear button) */
  onOpenTestSetup?: () => void;
  showSuccess?: (message: string, options?: { undoAction?: () => void; undoLabel?: string; duration?: number }) => string;
  showError?: (message: string, duration?: number) => string;
}

export const BookDetail: React.FC<BookDetailProps> = ({ book, progress, loadingProgress, onBack, onRead, onTest, onInstantStart, onOpenTestSetup, showSuccess, showError }) => {
  const [isChaptersOpen, setIsChaptersOpen] = useState(true);
  const [isAddingBook, setIsAddingBook] = useState(false);

  // Determine if book is in active courses (has progress data)
  const isInActiveCourses = !!progress;

  // Handle Test Yourself click with auto-add to active courses
  const handleTestClick = useCallback(async () => {
    console.log('[BookDetail] handleTestClick called, book.id:', book.id);
    
    if (!book.id) {
      onTest();
      return;
    }

    setIsAddingBook(true);

    try {
      // Check if book is already in active courses
      const alreadyActive = await isBookActive(book.id);
      console.log('[BookDetail] alreadyActive:', alreadyActive);

      if (alreadyActive) {
        // Already active, just start the quiz
        onTest();
      } else {
        // First time - add to active courses
        try {
          await addActiveBook(book.id, book.title);
          console.log('[BookDetail] Book added to active courses, showing toast...');
          
          // Show success toast with undo option (if showSuccess is provided)
          if (showSuccess) {
            showSuccess(
              `Added "${book.title}" to Active Courses`,
              {
                undoAction: async () => {
                  try {
                    await removeActiveBook(book.id!);
                    console.log('[BookDetail] Undo successful');
                  } catch (undoError) {
                    console.error('[BookDetail] Undo failed:', undoError);
                    showError?.('Undo failed');
                  }
                },
                undoLabel: 'Undo',
                duration: 8000,
              }
            );
            console.log('[BookDetail] Toast shown, now calling onTest()');
          }

          // Start the quiz immediately
          onTest();
        } catch (addError) {
          console.error('[BookDetail] Failed to add book:', addError);
          // POST failed - show error toast, don't start quiz
          showError?.("Couldn't add book — try again");
          setIsAddingBook(false);
          return;
        }
      }
    } catch (error) {
      // Error checking active status - just proceed with test
      console.error('Error checking active book status:', error);
      onTest();
    }

    setIsAddingBook(false);
  }, [book.id, book.title, onTest, showSuccess, showError]);

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
        <div className="p-4 md:p-8 border-b border-[#A1887F]/20 relative overflow-hidden">
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
            
            <h1 className="text-xl md:text-3xl font-extrabold text-white mb-0.5 leading-tight tracking-tight">
              {book.title}
            </h1>
            <p className="text-sm md:text-lg text-brand-lightBrown font-serif italic mb-3 md:mb-5">
              by {book.author}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <button 
                onClick={() => onRead(0)}
                className="flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-darkOrange text-white text-xs md:text-sm font-bold py-2 px-4 md:py-2.5 md:px-6 rounded-full shadow-lg shadow-brand-orange/30 transition-all hover:scale-105 hover:shadow-xl w-full sm:w-auto"
              >
                <PlayCircle className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                Start Reading
              </button>

              {/* Test Button Group: Primary Button + Gear */}
              {loadingProgress ? (
                // Loading state - show skeleton-like button while checking active status
                <button 
                  disabled
                  className="flex items-center justify-center gap-2 bg-[#5D4037] border border-[#A1887F]/30 text-white/60 text-xs md:text-sm font-bold py-2 px-4 md:py-2.5 md:px-6 rounded-full shadow-lg w-full sm:w-auto cursor-wait"
                >
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  Loading...
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Main Test Button - Instant Start */}
                  {isInActiveCourses ? (
                    <button 
                      onClick={onInstantStart || handleTestClick}
                      disabled={isAddingBook}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-darkOrange text-white text-xs md:text-sm font-bold py-2 px-4 md:py-2.5 md:px-6 rounded-full shadow-lg shadow-brand-orange/30 transition-all hover:scale-105 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isAddingBook ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      ) : (
                        <BrainCircuit className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                      Continue Test
                    </button>
                  ) : (
                    <button 
                      onClick={onInstantStart || handleTestClick}
                      disabled={isAddingBook}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 border-2 border-brand-orange/50 text-brand-cream font-bold text-xs md:text-sm py-2 px-4 md:py-2.5 md:px-6 rounded-full shadow-lg transition-all hover:border-brand-orange hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isAddingBook ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      ) : (
                        <BrainCircuit className="w-4 h-4 md:w-5 md:h-5 text-brand-orange" />
                      )}
                      Test Yourself
                    </button>
                  )}
                  
                  {/* Gear Button - Opens Full Modal */}
                  <button 
                    onClick={onOpenTestSetup || onTest}
                    disabled={isAddingBook}
                    title="Customise scope, difficulty, length…"
                    className="p-2 md:p-2.5 bg-white/5 hover:bg-white/20 rounded-full text-brand-cream/80 hover:text-white transition-colors border border-white/5 hover:border-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Settings className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 md:p-8">
          
          {/* Synopsis */}
          <div className="mb-4 md:mb-6">
            <h3 className="text-sm md:text-base font-bold text-brand-orange mb-1.5 md:mb-2 uppercase tracking-wide">Synopsis</h3>
            <p className="text-sm md:text-base text-brand-cream/90 leading-relaxed font-light">
              {book.longDescription}
            </p>
          </div>

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
              className={`transition-all duration-500 ease-in-out ${
                isChaptersOpen ? 'max-h-[500px] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'
              }`}
            >
              <div className="p-3 md:p-5 pt-0 border-t border-white/5">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-3 mt-2 md:mt-4">
                  {book.chapters.map((chapter, index) => {
                    const chapterProgress = progress?.chapterBreakdown.find(c => c.chapterIndex === index);
                    const isMastered = chapterProgress?.status === 'MASTERED';

                    return (
                      <li key={index}>
                        <button
                          onClick={() => onRead(index)}
                          className="w-full flex items-center p-2 md:p-3 rounded-lg hover:bg-white/10 hover:translate-x-1 transition-all border border-transparent hover:border-white/5 group text-left relative overflow-hidden"
                        >
                          {isMastered && (
                            <div className="absolute right-0 top-0 p-1">
                              <CheckCircle className="w-3 h-3 text-green-500/50" />
                            </div>
                          )}
                          <span className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full text-xs font-bold mr-2 md:mr-3 shrink-0 transition-colors ${isMastered ? 'bg-green-500/20 text-green-400' : 'bg-brand-brown/50 text-brand-orange group-hover:bg-brand-orange group-hover:text-white'}`}>
                            {index + 1}
                          </span>
                          <span className="text-brand-cream/90 text-sm font-medium truncate group-hover:text-white flex-1">
                            {chapter}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};