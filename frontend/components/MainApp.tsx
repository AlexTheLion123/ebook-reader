import { useState, useEffect } from 'react';
import { Search, Loader2, Bell, BookOpen, LayoutGrid, List } from 'lucide-react';
import { listBooks } from '../services/backendService';
import { BookRecommendation, BookDetails, BookProgress } from '../types';
import { BookCard } from './BookCard';
import { BookDetail } from './BookDetail';
import { ReaderView } from './ReaderView';
import { TestSuite } from './TestSuite';
import { Dashboard } from './Dashboard';

interface MainAppProps {
  initialQuery: string;
}

type AppView = 'HOME' | 'DETAILS' | 'READING' | 'TESTING' | 'DASHBOARD';

export const MainApp: React.FC<MainAppProps> = ({ initialQuery }) => {
  const [query, setQuery] = useState(initialQuery);
  const [books, setBooks] = useState<BookRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentView, setCurrentView] = useState<AppView>('HOME');
  
  // Detail View State
  const [selectedBook, setSelectedBook] = useState<BookDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Reader State
  const [readingChapterIndex, setReadingChapterIndex] = useState(0);

  // Mock progress data for dashboard (will be replaced with real data later)
  const [progressData] = useState<BookProgress[]>([
    {
      bookTitle: 'Pride and Prejudice',
      overallMastery: 42,
      chaptersMastered: 18,
      totalChapters: 61,
      lastTestedDate: '2023-10-25',
      weakAreas: ['Character Motivations', 'Historical Context', 'Irony'],
      concepts: [
        { name: 'Themes', score: 40 },
        { name: 'Symbols', score: 30 },
        { name: 'Characters', score: 65 },
        { name: 'Irony', score: 55 },
      ],
      chapterBreakdown: [
        // First 18 chapters mastered (green)
        ...Array.from({ length: 18 }, (_, i) => ({ chapterIndex: i, status: 'MASTERED' as const, score: 85 + Math.floor(Math.random() * 15) })),
        // Next 8 chapters in progress (yellow)
        ...Array.from({ length: 8 }, (_, i) => ({ chapterIndex: i + 18, status: 'IN_PROGRESS' as const, score: 40 + Math.floor(Math.random() * 30) })),
        // Remaining 35 chapters untouched (gray)
        ...Array.from({ length: 35 }, (_, i) => ({ chapterIndex: i + 26, status: 'UNTOUCHED' as const, score: 0 })),
      ],
    },
    {
      bookTitle: 'Calculus Made Easy',
      overallMastery: 28,
      chaptersMastered: 5,
      totalChapters: 23,
      lastTestedDate: '2023-11-12',
      weakAreas: ['Integration', 'Partial Fractions', 'Limits'],
      concepts: [
        { name: 'Derivatives', score: 72 },
        { name: 'Integration', score: 25 },
        { name: 'Limits', score: 35 },
        { name: 'Applications', score: 18 },
      ],
      chapterBreakdown: [
        // First 5 chapters mastered
        ...Array.from({ length: 5 }, (_, i) => ({ chapterIndex: i, status: 'MASTERED' as const, score: 80 + Math.floor(Math.random() * 20) })),
        // Next 4 in progress
        ...Array.from({ length: 4 }, (_, i) => ({ chapterIndex: i + 5, status: 'IN_PROGRESS' as const, score: 30 + Math.floor(Math.random() * 35) })),
        // Remaining 14 untouched
        ...Array.from({ length: 14 }, (_, i) => ({ chapterIndex: i + 9, status: 'UNTOUCHED' as const, score: 0 })),
      ],
    },
  ]);

  const fetchBooks = async (searchQuery?: string) => {
    setLoading(true);
    // Reset detail view when fetching books
    setSelectedBook(null);
    setCurrentView('HOME');
    
    try {
      const backendBooks = await listBooks();
      
      // Map backend books to BookRecommendation format
      const mappedBooks: BookRecommendation[] = backendBooks.map(b => {
        // Extract ID from PK if bookId is missing (PK format: "book#UUID")
        const id = b.bookId || (b.PK ? b.PK.replace('book#', '') : 'unknown');
        
        // Use filename as title if title is missing, removing the .epub extension
        const displayTitle = b.title || (b.fileName ? b.fileName.replace(/\.epub$/i, '') : 'Untitled Book');

        // Extract chapter titles from chapter objects (API returns objects with title, order, etc.)
        const chapterTitles = (b.chapters || []).map((ch: any) => 
          typeof ch === 'string' ? ch : (ch.title || `Chapter ${ch.order || '?'}`)
        );

        return {
          title: displayTitle,
          author: b.author || 'Unknown Author',
          description: b.description || 'Uploaded EPUB Textbook',
          rating: 5.0,
          id: id,
          chapters: chapterTitles,
          concepts: b.concepts || []
        } as any;
      });

      setBooks(mappedBooks as any);
    } catch (e) {
      console.error("Failed to fetch books", e);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  const handleBookClick = async (book: BookRecommendation) => {
    // For uploaded books, we don't need to fetch details from Gemini.
    // We just construct a BookDetails object directly.
    const bookId = (book as any).id;
    const chapters = (book as any).chapters || [];
    const concepts = (book as any).concepts || [];
    
    const details: BookDetails = {
      ...book,
      longDescription: "This is an uploaded textbook.",
      chapters: chapters,
      id: bookId, // Pass the bookId through to BookDetails
      concepts: concepts
    };
    
    setSelectedBook(details);
    setCurrentView('DETAILS');
  };

  const handleStartReading = (chapterIndex: number) => {
    setReadingChapterIndex(chapterIndex);
    setCurrentView('READING');
  };

  const handleCloseReader = () => {
    setCurrentView('DETAILS');
    // Keep selectedBook so we go back to book details, not the main list
  };

  const handleNavHome = () => {
    setSelectedBook(null);
    setCurrentView('HOME');
  };

  const handleNavDashboard = () => {
    setCurrentView('DASHBOARD');
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, search is client-side filtering since we fetch all books
    // In a real app, we'd call a search endpoint
    // fetchBooks();
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

  // Render Reader View Overlay (Hides Navbar)
  if (currentView === 'READING' && selectedBook) {
    return (
      <ReaderView 
        book={selectedBook} 
        initialChapterIndex={readingChapterIndex} 
        onClose={handleCloseReader} 
      />
    );
  }

  // Render Test Suite Overlay (Hides Navbar)
  if (currentView === 'TESTING' && selectedBook) {
    return (
      <TestSuite 
        book={selectedBook} 
        onClose={() => setCurrentView('DETAILS')} 
      />
    );
  }

  return (
    // Removed bg-gradient here because the background is now handled in App.tsx with the image
    <div className="min-h-screen w-full bg-transparent text-brand-cream overflow-y-auto">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full px-6 md:px-12 py-6 flex items-center justify-between bg-[#5D4037]/60 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleNavHome}>
          <div className="bg-brand-orange p-2 rounded-lg shadow-lg shadow-brand-orange/20">
             <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">QuickBook</span>
        </div>

        <div className="hidden md:flex items-center gap-8 font-medium text-brand-cream/90">
          <button onClick={handleNavHome} className={`hover:text-brand-orange transition-colors shadow-sm ${currentView === 'HOME' ? 'text-white font-bold' : ''}`}>Library</button>
          <button onClick={handleNavDashboard} className={`hover:text-brand-orange transition-colors shadow-sm ${currentView === 'DASHBOARD' ? 'text-white font-bold' : ''}`}>My Dashboard</button>
          <a href="#" className="hover:text-brand-orange transition-colors">About Us</a>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand-orange rounded-full border-2 border-[#5D4037]"></span>
          </button>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 pl-2 pr-4 py-1.5 rounded-full transition-colors border border-white/10" onClick={handleNavDashboard}>
            <div className="w-8 h-8 bg-gradient-to-br from-brand-orange to-brand-darkOrange rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner">
              JD
            </div>
            <span className="text-sm font-medium hidden sm:block text-white">My Account</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="px-4 md:px-12 py-6 md:py-10 max-w-7xl mx-auto">
        
        {currentView === 'DASHBOARD' ? (
          <Dashboard 
            progressData={progressData}
            onBack={handleNavHome}
            onContinue={(bookTitle) => {
              setQuery(bookTitle);
              fetchBooks(bookTitle);
            }}
          />
        ) : currentView === 'DETAILS' && selectedBook ? (
          // DETAIL VIEW
          <BookDetail 
            book={selectedBook} 
            progress={progressData.find(p => p.bookTitle === selectedBook.title) || null}
            onBack={handleNavHome} 
            onRead={handleStartReading}
            onTest={() => setCurrentView('TESTING')}
          />
        ) : (
          // LIST VIEW (HOME)
          <>
            {/* Search Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 mb-4 md:mb-6">
              <div>
                <h2 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {hasSearched ? `Results for "${query || 'Classics'}"` : 'Discover Your Next Read'}
                </h2>
                <p className="text-sm md:text-base text-brand-cream/80">Explore our vast collection of curated titles.</p>
              </div>

              <form onSubmit={handleSearch} className="relative w-full md:w-96 group">
                 <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 md:h-5 md:w-5 text-brand-cream/60 group-focus-within:text-brand-orange transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a book..."
                    className="block w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-3 rounded-xl leading-5 bg-black/30 text-sm md:text-base text-white placeholder-brand-cream/50 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:bg-black/40 transition-all border border-white/10 hover:border-white/20 backdrop-blur-sm"
                  />
              </form>
            </div>

            {/* Controls Bar: Genre Chips & View Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
              
              {/* Genre Chips */}
              <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 w-full sm:w-auto thin-scrollbar">
                {['All Genres', 'Fiction', 'Non-Fiction', 'Sci-Fi', 'Mystery', 'Biography', 'History', 'Self-Help'].map((genre, i) => (
                  <button 
                    key={genre}
                    onClick={() => {
                      setQuery(genre === 'All Genres' ? '' : genre);
                      fetchBooks();
                    }}
                    className={`whitespace-nowrap px-3 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 border backdrop-blur-sm ${
                      i === 0 
                      ? 'bg-brand-orange border-brand-orange text-white shadow-lg shadow-brand-orange/20' 
                      : 'bg-black/20 border-white/5 hover:bg-black/30 hover:border-white/20 text-white'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              {/* View Toggle - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5 self-end sm:self-auto shrink-0">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === 'grid' 
                    ? 'bg-brand-orange text-white shadow-sm' 
                    : 'text-brand-cream/60 hover:text-white hover:bg-white/5'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === 'list' 
                    ? 'bg-brand-orange text-white shadow-sm' 
                    : 'text-brand-cream/60 hover:text-white hover:bg-white/5'
                  }`}
                  title="List View"
                >
                  <List size={18} />
                </button>
              </div>

            </div>

            {/* Results Grid/List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-brand-orange animate-spin mb-4" />
                <p className="text-white/80 animate-pulse">Finding the perfect books for you...</p>
              </div>
            ) : (
              <div className={`grid animate-slide-up ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                  : 'grid-cols-1 gap-3'
              }`}>
                {books.map((book, idx) => {
                  const bookProgress = progressData.find(p => p.bookTitle === book.title);
                  return (
                    <BookCard 
                      key={idx} 
                      book={book} 
                      onClick={handleBookClick} 
                      viewMode={viewMode}
                      mastery={bookProgress?.overallMastery}
                    />
                  );
                })}
                {books.length === 0 && hasSearched && (
                   <div className="col-span-full text-center py-20 text-white/60">
                      No books found. Try a different search term.
                   </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};