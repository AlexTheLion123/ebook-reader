import React, { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onEnterApp: (initialQuery: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onEnterApp }) => {
  const [query, setQuery] = useState('');

  const handleSearchClick = () => {
    onEnterApp(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  return (
    <div className="flex flex-col items-start justify-center h-full w-full max-w-2xl px-6 md:px-12 lg:px-20 pt-20 md:pt-0 animate-fade-in">
      {/* Main Headline - Classic White Theme */}
      <h1 
        className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-[1.1]"
        style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
      >
        Browse our <br />
        Library
      </h1>

      {/* Subtext */}
      <p 
        className="text-lg md:text-xl text-gray-300 mb-10 max-w-lg leading-relaxed font-medium"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
      >
        Learn how books can expand your horizons and direct your learning journey. 
        Discover new worlds within our curated collection.
      </p>

      {/* Search Input Container - Glassmorphism */}
      <div className="relative w-full max-w-md mb-8 group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-gray-400 group-focus-within:text-brand-orange transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Searcher here!"
          className="block w-full pl-14 pr-6 py-5 rounded-full leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-brand-orange/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 text-lg border-2 border-transparent focus:border-brand-orange/20"
        />
      </div>

      {/* Search More Button */}
      <button
        onClick={handleSearchClick}
        className="bg-brand-orange hover:bg-brand-darkOrange text-white text-lg font-bold py-4 px-10 rounded-full transition-all duration-300 shadow-[0_10px_20px_rgba(243,120,53,0.3)] hover:shadow-[0_15px_25px_rgba(243,120,53,0.5)] hover:scale-105 flex items-center group"
      >
        Search More
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};