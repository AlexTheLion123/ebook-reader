import React from 'react';
import { BookOpen } from 'lucide-react';
import { BookRecommendation } from '../types';

interface BookCardProps {
  book: BookRecommendation;
  onClick: (book: BookRecommendation) => void;
  onTest: (book: BookRecommendation) => void;
  viewMode?: 'grid' | 'list';
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick, onTest, viewMode = 'grid' }) => {
  const baseClasses = "bg-[#3E2723]/85 backdrop-blur-md border border-[#A1887F]/30 rounded-xl text-white hover:bg-[#4E342E]/95 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer group relative overflow-hidden";

  // Prevent bubble up for test button
  const handleTestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTest(book);
  };

  if (viewMode === 'list') {
    return (
      <div 
        onClick={() => onClick(book)}
        className={`${baseClasses} hover:-translate-y-0.5`}
      >
        <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          {/* Left Section: Title & Author */}
          <div className="flex-shrink-0 md:w-1/4">
            <h3 className="font-bold text-lg md:text-xl leading-tight text-orange-50 group-hover:text-brand-orange transition-colors mb-1">{book.title}</h3>
            <p className="text-xs md:text-sm text-brand-lightBrown italic font-medium">by {book.author}</p>
          </div>

          {/* Middle Section: Description */}
          <div className="flex-1 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6">
            <p className="text-xs md:text-sm text-gray-200 line-clamp-2 md:line-clamp-2 leading-relaxed opacity-90">{book.description}</p>
          </div>

          {/* Right Section: Test Button */}
          <div className="flex items-center justify-end md:w-auto mt-1 md:mt-0">
            <button 
              onClick={handleTestClick}
              className="px-5 py-1.5 rounded-full border-2 border-brand-orange text-brand-orange font-bold text-xs hover:bg-brand-orange hover:text-white transition-all uppercase tracking-wide"
            >
              Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default Grid View
  return (
    <div 
      onClick={() => onClick(book)}
      className={`${baseClasses} hover:-translate-y-1 flex flex-col h-full`}
    >
      <div className="p-4 md:p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2 md:mb-3">
          <h3 className="font-bold text-lg md:text-xl leading-tight text-orange-50 group-hover:text-brand-orange transition-colors pr-2">{book.title}</h3>
        </div>
        <p className="text-xs md:text-sm text-brand-lightBrown mb-2 md:mb-3 italic font-medium">by {book.author}</p>
        <p className="text-xs md:text-sm text-gray-200 line-clamp-4 leading-relaxed flex-1">{book.description}</p>
        
        {/* Footer Area */}
        <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center text-xs text-brand-orange uppercase tracking-wider font-bold group-hover:text-brand-darkOrange transition-colors">
            <BookOpen className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
            Details
          </div>
          
          {/* Test Button */}
          <button 
            onClick={handleTestClick}
            className="px-4 py-1.5 rounded-full border border-brand-orange text-brand-orange font-bold text-xs hover:bg-brand-orange hover:text-white transition-all uppercase tracking-wide"
          >
            Test
          </button>
        </div>
      </div>
    </div>
  );
};