import React, { useState, useRef } from 'react';
import { ArrowLeft, Star, BookOpen, ChevronDown, ChevronUp, List, PlayCircle } from 'lucide-react';
import { BookDetails } from '../types';

interface BookDetailProps {
  book: BookDetails;
  onBack: () => void;
  onRead: (chapterIndex: number) => void;
}

export const BookDetail: React.FC<BookDetailProps> = ({ book, onBack, onRead }) => {
  const [isChaptersOpen, setIsChaptersOpen] = useState(true);
  const chaptersRef = useRef<HTMLDivElement>(null);

  const toggleChapters = () => {
    const newState = !isChaptersOpen;
    setIsChaptersOpen(newState);
    
    if (newState) {
      setTimeout(() => {
        chaptersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-20">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center text-brand-cream/80 hover:text-brand-orange transition-colors mb-6 font-medium group"
      >
        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Search
      </button>

      {/* Main Card */}
      <div className="bg-[#3E2723]/90 backdrop-blur-lg border border-[#A1887F]/30 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header Section */}
        <div className="p-8 md:p-10 border-b border-[#A1887F]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <BookOpen className="w-40 h-40 text-white" />
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="bg-brand-orange/90 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md inline-flex items-center justify-center">
                Recommended Read
              </span>
              <div className="flex items-center bg-black/40 px-3 py-1 rounded-full border border-white/10">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 mr-1.5" />
                <span className="text-sm font-bold text-white">{book.rating}/5.0</span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 leading-tight tracking-tight">
              {book.title}
            </h1>
            <p className="text-xl md:text-2xl text-brand-lightBrown font-serif italic mb-8">
              by {book.author}
            </p>

            {/* Primary Action Button */}
            <button 
              onClick={() => onRead(0)}
              className="flex items-center gap-2 bg-brand-orange hover:bg-brand-darkOrange text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-brand-orange/30 transition-all hover:scale-105 hover:shadow-xl"
            >
              <PlayCircle className="w-5 h-5 fill-current" />
              Start Reading
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 md:p-10">
          
          {/* Synopsis */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-brand-orange mb-3 uppercase tracking-wide">Synopsis</h3>
            <p className="text-lg text-brand-cream/90 leading-relaxed font-light">
              {book.longDescription}
            </p>
          </div>

          {/* Chapters Dropdown */}
          <div ref={chaptersRef} className="border border-[#A1887F]/30 rounded-xl bg-black/20 overflow-hidden transition-all duration-300">
            <button 
              onClick={toggleChapters}
              className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors text-left"
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
              <div className="p-5 pt-0 border-t border-white/5">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {book.chapters.map((chapter, index) => (
                    <li 
                      key={index}
                    >
                      <button
                        onClick={() => onRead(index)}
                        className="w-full flex items-center p-3 rounded-lg hover:bg-white/10 hover:translate-x-1 transition-all border border-transparent hover:border-white/5 group text-left"
                      >
                        <span className="w-8 h-8 flex items-center justify-center bg-brand-brown/50 rounded-full text-xs font-bold text-brand-orange mr-3 shrink-0 group-hover:bg-brand-orange group-hover:text-white transition-colors">
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
