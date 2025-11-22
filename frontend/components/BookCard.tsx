import React from 'react';
import { Star, BookOpen } from 'lucide-react';
import { BookRecommendation } from '../types';

interface BookCardProps {
  book: BookRecommendation;
  onClick: (book: BookRecommendation) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  return (
    // Changed from bg-white/10 to bg-[#3E2723]/85 (Dark Brown with high opacity)
    // This makes the cards much less transparent and fits the brown theme better
    <div 
      onClick={() => onClick(book)}
      className="bg-[#3E2723]/85 backdrop-blur-md border border-[#A1887F]/30 p-5 rounded-xl text-white hover:bg-[#4E342E]/95 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-xl leading-tight text-orange-50 group-hover:text-brand-orange transition-colors">{book.title}</h3>
        <div className="flex items-center bg-black/40 px-2 py-1 rounded-lg border border-white/5">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 mr-1" />
          <span className="text-xs font-bold text-white">{book.rating}</span>
        </div>
      </div>
      <p className="text-sm text-brand-lightBrown mb-3 italic font-medium">by {book.author}</p>
      <p className="text-sm text-gray-200 line-clamp-4 leading-relaxed">{book.description}</p>
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center text-xs text-brand-orange uppercase tracking-wider font-bold group-hover:text-brand-darkOrange transition-colors">
        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
        Read Details
      </div>
    </div>
  );
};