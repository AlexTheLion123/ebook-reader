import React, { useState } from 'react';
import { ArrowLeft, Star, BookOpen, ChevronDown, ChevronUp, List, PlayCircle, BrainCircuit } from 'lucide-react';
import { BookDetails } from '../types';

interface BookDetailProps {
  book: BookDetails;
  onBack: () => void;
  onRead: (chapterIndex: number) => void;
  onTest: () => void;
}

export const BookDetail: React.FC<BookDetailProps> = ({ book, onBack, onRead, onTest }) => {
  const [isChaptersOpen, setIsChaptersOpen] = useState(true);

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