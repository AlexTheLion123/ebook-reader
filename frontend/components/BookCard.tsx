import React from 'react';
import { Star, BookOpen, ChevronRight } from 'lucide-react';
import { BookRecommendation } from '../types';

interface BookCardProps {
  book: BookRecommendation;
  onClick: (book: BookRecommendation) => void;
  viewMode?: 'grid' | 'list';
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick, viewMode = 'grid' }) => {
  const baseClasses = "bg-[#3E2723]/85 backdrop-blur-md border border-[#A1887F]/30 rounded-xl text-white hover:bg-[#4E342E]/95 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer group relative overflow-hidden";

  if (viewMode === 'list') {
    return (
      <div 
        onClick={() => onClick(book)}
        className={`${baseClasses} p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 hover:-translate-y-0.5`}
      >
        {/* Left Section: Title & Author */}
        <div className="flex-shrink-0 md:w-1/4">
          <h3 className="font-bold text-lg md:text-xl leading-tight text-orange-50 group-hover:text-brand-orange transition-colors mb-1">{book.title}</h3>
          <p className="text-xs md:text-sm text-brand-lightBrown italic font-medium">by {book.author}</p>
        </div>

        {/* Middle Section: Description */}
        <div className="flex-1 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6">
          <p className="text-xs md:text-sm text-gray-200 line-clamp-2 md:line-clamp-2 leading-relaxed opacity-90">{book.description}</p>
        </div>

        {/* Right Section: Rating & Action */}
        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 md:w-auto mt-1 md:mt-0">
          <div className="flex items-center bg-black/40 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg border border-white/5">
            <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400 fill-yellow-400 mr-1 md:mr-1.5" />
            <span className="text-xs md:text-sm font-bold text-white">{book.rating}</span>
          </div>
          
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-brand-orange transition-colors">
             <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // Default Grid View
  return (
    <div 
      onClick={() => onClick(book)}
      className={`${baseClasses} p-4 md:p-5 hover:-translate-y-1`}
    >
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <h3 className="font-bold text-lg md:text-xl leading-tight text-orange-50 group-hover:text-brand-orange transition-colors pr-2">{book.title}</h3>
        <div className="flex items-center bg-black/40 px-2 py-0.5 md:py-1 rounded-lg border border-white/5 shrink-0">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 mr-1" />
          <span className="text-xs font-bold text-white">{book.rating}</span>
        </div>
      </div>
      <p className="text-xs md:text-sm text-brand-lightBrown mb-2 md:mb-3 italic font-medium">by {book.author}</p>
      <p className="text-xs md:text-sm text-gray-200 line-clamp-4 leading-relaxed">{book.description}</p>
      <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-white/10 flex items-center text-xs text-brand-orange uppercase tracking-wider font-bold group-hover:text-brand-darkOrange transition-colors">
        <BookOpen className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
        Read Details
      </div>
    </div>
  );
};