import React, { useState, useEffect } from 'react';
import { Search, Loader2, Bell, BookOpen } from 'lucide-react';
import { getBookRecommendations, getBookDetails } from '../services/geminiService';
import { BookRecommendation, BookDetails } from '../types';
import { BookCard } from './BookCard';
import { BookDetail } from './BookDetail';
import { ReaderView } from './ReaderView';

interface MainAppProps {
  initialQuery: string;
}

export const MainApp: React.FC<MainAppProps> = ({ initialQuery }) => {
  const [query, setQuery] = useState(initialQuery);
  const [books, setBooks] = useState<BookRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Detail View State
  const [selectedBook, setSelectedBook] = useState<BookDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Reader State
  const [isReading, setIsReading] = useState(false);
  const [readingChapterIndex, setReadingChapterIndex] = useState(0);

  const fetchBooks = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    // Reset detail view when searching new books
    setSelectedBook(null);
    setIsReading(false);
    setLoading(true);
    try {
      const results = await getBookRecommendations(searchQuery);
      setBooks(results);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  const handleBookClick = async (book: BookRecommendation) => {
    setLoadingDetails(true);
    try {
      const details = await getBookDetails(book);
      if (details) {
        setSelectedBook(details);
      }
    } catch (e) {
      console.error("Failed to load book details", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStartReading = (chapterIndex: number) => {
    setReadingChapterIndex(chapterIndex);
    setIsReading(true);
  };

  const handleCloseReader = () => {
    setIsReading(false);
  };

  useEffect(() => {
    if (initialQuery) {
      fetchBooks(initialQuery);
    } else {
      // Default recommendations if no query provided
      fetchBooks("popular classic literature");
    }
  }, []); // Run once on mount

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBooks(query);
  };

  // Loading State for Details Overlay
  if (loadingDetails) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black/50 z-50 fixed inset-0 backdrop-blur-sm">
        <Loader2 className="w-16 h-16 text-brand-orange animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-white">Opening Book...</h2>
        <p className="text-brand-cream/70 mt-2">Fetching chapters and details</p>
      </div>
    );
  }

  // Render Reader View Overlay
  if (isReading && selectedBook) {
    return (
      <ReaderView 
        book={selectedBook} 
        initialChapterIndex={readingChapterIndex} 
        onClose={handleCloseReader} 
      />
    );
  }

  return (
    // Removed bg-gradient here because the background is now handled in App.tsx with the image
    <div className="min-h-screen w-full bg-transparent text-brand-cream overflow-y-auto">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full px-6 md:px-12 py-6 flex items-center justify-between bg-[#5D4037]/60 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedBook(null)}>
          <div className="bg-brand-orange p-2 rounded-lg shadow-lg shadow-brand-orange/20">
             <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Top Picks</span>
        </div>

        <div className="hidden md:flex items-center gap-8 font-medium text-brand-cream/90">
          <a href="#" onClick={() => setSelectedBook(null)} className="hover:text-brand-orange transition-colors shadow-sm">Home</a>
          <a href="#" onClick={() => setSelectedBook(null)} className="text-white font-bold hover:text-brand-orange transition-colors relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1 after:bg-brand-orange after:rounded-full">Library</a>
          <a href="#" className="hover:text-brand-orange transition-colors">About Us</a>
          <a href="#" className="hover:text-brand-orange transition-colors">Contact Help</a>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand-orange rounded-full border-2 border-[#5D4037]"></span>
          </button>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 pl-2 pr-4 py-1.5 rounded-full transition-colors border border-white/10">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-orange to-brand-darkOrange rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner">
              JD
            </div>
            <span className="text-sm font-medium hidden sm:block text-white">My Account</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="px-6 md:px-12 py-10 max-w-7xl mx-auto">
        
        {selectedBook ? (
          <BookDetail 
            book={selectedBook} 
            onBack={() => setSelectedBook(null)} 
            onRead={handleStartReading}
          />
        ) : (
          <>
        {/* Search Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 
              className="text-3xl md:text-4xl font-bold mb-2 text-white"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
            >
              {hasSearched ? `Results for "${query || 'Classics'}"` : 'Discover Your Next Read'}
            </h2>
            <p className="text-brand-cream/80">Explore our vast collection of curated titles.</p>
          </div>

          <form onSubmit={handleSearch} className="relative w-full md:w-96 group">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-brand-cream/60 group-focus-within:text-brand-orange transition-colors" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a book..."
                className="block w-full pl-12 pr-4 py-3 rounded-xl leading-5 bg-black/30 text-white placeholder-brand-cream/50 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:bg-black/40 transition-all border border-white/10 hover:border-white/20 backdrop-blur-sm"
              />
          </form>
        </div>

        {/* Categories / Filters Chips */}
        <div className="flex gap-3 overflow-x-auto pb-6 mb-6 scrollbar-hide">
          {['All Genres', 'Fiction', 'Non-Fiction', 'Sci-Fi', 'Mystery', 'Biography', 'History', 'Self-Help'].map((genre, i) => (
            <button 
              key={genre}
              onClick={() => {
                setQuery(genre === 'All Genres' ? '' : genre);
                fetchBooks(genre === 'All Genres' ? 'popular books' : genre);
              }}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border backdrop-blur-sm ${
                i === 0 
                ? 'bg-brand-orange border-brand-orange text-white shadow-lg shadow-brand-orange/20' 
                : 'bg-black/20 border-white/5 hover:bg-black/30 hover:border-white/20 text-white'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-brand-orange animate-spin mb-4" />
            <p className="text-brand-cream/70 text-lg animate-pulse">Curating the best books for you...</p>
          </div>
        ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {books.map((book, index) => (
                  <BookCard key={index} book={book} onClick={handleBookClick} />
                ))}
              </div>
        )}
          </>
        )}
      </main>
    </div>
  );
};