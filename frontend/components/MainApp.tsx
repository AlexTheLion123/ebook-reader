import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, BookOpen, LayoutGrid, List, Settings, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listBooks } from '../services/backendService';
import { fetchChapterStats, fetchSrsBatch } from '../services/srsService';
import { getUserActiveBooks } from '../services/userActiveBooksService';
import { BookRecommendation, BookDetails, BookProgress, ChapterStatsResponse, TestSessionConfig } from '../types';
import { BookCard } from './BookCard';
import { BookDetail } from './BookDetail';
import { ReaderView } from './ReaderView';
import { TestSuite } from './TestSuite';
import { Dashboard } from './Dashboard';
import { UserMenu } from './UserMenu';
import { useAuth } from './AuthProvider';
import { useToast, ToastContainer } from './Toast';
import { TestConfigModal, getSavedTestConfig } from './TestConfigModal';

interface MainAppProps {
  initialQuery?: string;
  initialBookId?: string;
  initialChapter?: number;
  initialView?: string;
  onRequestLogin?: () => void;
}

type AppView = 'HOME' | 'DETAILS' | 'READING' | 'TESTING' | 'DASHBOARD';

export const MainApp: React.FC<MainAppProps> = ({ 
  initialQuery = '', 
  initialBookId,
  initialChapter,
  initialView,
  onRequestLogin 
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  const handleRequestLogin = () => {
    if (onRequestLogin) {
      onRequestLogin();
    } else {
      navigate('/login');
    }
  };
  
  const [query, setQuery] = useState(initialQuery);
  const [books, setBooks] = useState<BookRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Initialize view based on URL params to avoid wrong loading state
  const getInitialView = (): AppView => {
    if (initialView === 'testing' && initialBookId) return 'TESTING';
    if (initialChapter !== undefined) return 'READING';
    if (initialBookId) return 'DETAILS';
    if (initialView === 'dashboard') return 'DASHBOARD';
    return 'HOME';
  };
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);
  
  // Detail View State
  const [selectedBook, setSelectedBook] = useState<BookDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Reader State - initialize from URL if present
  const [readingChapterIndex, setReadingChapterIndex] = useState(
    initialChapter !== undefined ? initialChapter - 1 : 0
  );
  
  // Track if this is the initial mount to avoid spurious URL updates
  const isInitialMount = useRef(true);

  // Progress data for dashboard - fetched from SRS API for ACTIVE books only
  const [progressData, setProgressData] = useState<BookProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true); // Start true to show loading immediately

  // Default test config - used when no specific config is set
  const defaultTestConfig: TestSessionConfig = {
    scope: 'chapters',
    chapters: [1, 2, 3],
    difficulty: ['medium'],
    length: 12,
    mode: 'Standard'
  };

  // Helper to build URL params from TestSessionConfig
  const buildConfigUrlParams = (config: TestSessionConfig): string => {
    const params = new URLSearchParams();
    params.set('scope', config.scope);
    if (config.chapters) params.set('chapters', config.chapters.join(','));
    if (config.concepts) params.set('concepts', config.concepts.join(','));
    params.set('difficulty', config.difficulty.join(','));
    if (config.length) params.set('length', String(config.length));
    params.set('mode', config.mode);
    return params.toString();
  };

  // Test session config for instant start (ALWAYS has a value, never undefined)
  const [testSessionConfig, setTestSessionConfig] = useState<TestSessionConfig>(defaultTestConfig);
  
  // First-time user tooltip state
  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(false);
  
  // Config modal state (settings cog opens this)
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configModalBook, setConfigModalBook] = useState<BookDetails | null>(null);

  // Fetch progress data only for books in user's Active Courses
  const fetchProgressData = useCallback(async (bookList: BookRecommendation[]) => {
    if (!isAuthenticated || bookList.length === 0) {
      setProgressData([]);
      setLoadingProgress(false);
      return;
    }

    setLoadingProgress(true);
    const progressResults: BookProgress[] = [];

    try {
      // Get user's active books from backend
      const activeBooks = await getUserActiveBooks();
      const activeBookIds = new Set(activeBooks.map(ab => ab.bookId));

      // Only fetch progress for books that are in active courses
      const activeBooksFromList = bookList.filter(book => book.id && activeBookIds.has(book.id));

      for (const book of activeBooksFromList) {
        if (!book.id) continue;
        
        // Get actual chapter count from book data (not from stats which only has tested chapters)
        const bookChapters = (book as any).chapters || [];
        const actualTotalChapters = bookChapters.length;
        
        try {
          const stats: ChapterStatsResponse = await fetchChapterStats(book.id);
          
          // Convert ChapterStatsResponse to BookProgress format
          const bookProgress: BookProgress = {
            bookId: book.id!,
            bookTitle: book.title,
            overallMastery: stats.overall.percentage,
            chaptersMastered: stats.chapters.filter(c => c.status === 'mastered').length,
            totalChapters: actualTotalChapters, // Use actual book chapter count, not stats
            lastTestedDate: new Date().toISOString().split('T')[0], // TODO: track this in backend
            weakAreas: [], // Could be derived from low-scoring concepts
            concepts: [], // TODO: fetch concept stats from backend when available
            chapterBreakdown: stats.chapters.map(c => ({
              chapterIndex: c.chapterNumber - 1, // Convert to 0-indexed
              status: c.status === 'mastered' ? 'MASTERED' as const 
                : c.status === 'in-progress' ? 'IN_PROGRESS' as const 
                : 'UNTOUCHED' as const,
              score: c.percentage,
            })),
          };
          progressResults.push(bookProgress);
        } catch (error) {
          console.debug(`Could not fetch progress for ${book.title}:`, error);
          // Create empty progress entry for this active book
          // Note: book.chapters may exist at runtime (added in fetchBooks) but isn't in BookRecommendation type
          const chapters = (book as any).chapters || [];
          progressResults.push({
            bookId: book.id!,
            bookTitle: book.title,
            overallMastery: 0,
            chaptersMastered: 0,
            totalChapters: chapters.length,
            lastTestedDate: '',
            weakAreas: [],
            concepts: [],
            chapterBreakdown: chapters.map((_: any, idx: number) => ({
              chapterIndex: idx,
              status: 'UNTOUCHED' as const,
              score: 0,
            })),
          });
        }
      }
    } catch (error) {
      console.error('Error fetching active books:', error);
    }

    setProgressData(progressResults);
    setLoadingProgress(false);
  }, [isAuthenticated]);

  const fetchBooks = async (searchQuery?: string) => {
    setLoading(true);
    
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
      
      // Fetch progress data for these books (if authenticated)
      fetchProgressData(mappedBooks);
    } catch (e) {
      console.error("Failed to fetch books", e);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = async (book: BookRecommendation, skipNavigation = false) => {
    // For uploaded books, we don't need to fetch details from Gemini.
    // We just construct a BookDetails object directly.
    const bookId = (book as any).id;
    const chapters = (book as any).chapters || [];
    const concepts = (book as any).concepts || [];
    
    const details: BookDetails = {
      ...book,
      longDescription: (book as any).description || "This is an uploaded textbook.",
      chapters: chapters,
      id: bookId, // Pass the bookId through to BookDetails
      concepts: concepts
    };
    
    setSelectedBook(details);
    setCurrentView('DETAILS');
    // Update URL to reflect book view (only if not from deep link)
    if (!skipNavigation) {
      navigate(`/book/${bookId}`, { replace: true });
    }
  };

  // Quick Test from Library Card (applies toast + auto-add logic)
  const handleQuickTest = async (book: BookRecommendation) => {
    // For uploaded books, construct BookDetails directly
    const bookId = (book as any).id;
    const chapters = (book as any).chapters || [];
    const concepts = (book as any).concepts || [];
    const totalChapters = chapters.length;
    
    const details: BookDetails = {
      ...book,
      longDescription: (book as any).description || "This is an uploaded textbook.",
      chapters: chapters,
      id: bookId,
      concepts: concepts
    };
    
    setSelectedBook(details);
    
    // Set default test config (first 3 chapters for new users)
    const safeChapters = [1, 2, 3].filter(c => c <= totalChapters);
    const config: TestSessionConfig = {
      scope: 'chapters',
      chapters: safeChapters,
      difficulty: ['medium'],
      length: 12,
      mode: 'Standard'
    };
    
    setTestSessionConfig(config);
    setCurrentView('TESTING');
    
    // Update URL with config params
    if (bookId) {
      navigate(`/book/${bookId}/test?${buildConfigUrlParams(config)}`, { replace: true });
    }
  };

  /**
   * Instant Start: One-tap test with smart defaults (2025 gold standard UX)
   * - First time user: Chapters 1-3 to avoid spoilers
   * - Returning user with due cards: Quick mode (due cards only)
   * - Returning user nothing due: Standard mode from ch 1 to last-read + 2
   */
  const handleInstantStart = async (book: BookRecommendation | BookDetails, progress?: BookProgress | null) => {
    const bookId = (book as any).id;
    const chapters = (book as any).chapters || [];
    const totalChapters = chapters.length;
    
    // Construct BookDetails if needed
    const details: BookDetails = 'longDescription' in book ? book : {
      ...book,
      longDescription: "This is an uploaded textbook.",
      chapters: chapters,
      id: bookId,
      concepts: (book as any).concepts || []
    };
    
    setSelectedBook(details);
    
    // Determine if this is first time testing this book
    const isFirstTime = !progress || progress.overallMastery === 0;
    
    if (isFirstTime) {
      // First time: safe chapters 1-3, no spoilers
      const safeChapters = [1, 2, 3].filter(c => c <= totalChapters);
      
      const config: TestSessionConfig = {
        scope: 'chapters',
        chapters: safeChapters,
        difficulty: ['medium'],
        length: 12,
        mode: 'Standard'
      };
      
      setTestSessionConfig(config);
      setCurrentView('TESTING');
      
      // Show first-time tooltip (only once per browser)
      const hasSeenTooltip = localStorage.getItem('quickbook-first-test-tooltip');
      if (!hasSeenTooltip) {
        setShowFirstTimeTooltip(true);
        localStorage.setItem('quickbook-first-test-tooltip', 'true');
        // Auto-hide after 4 seconds
        setTimeout(() => setShowFirstTimeTooltip(false), 4000);
      }
      
      if (bookId) navigate(`/book/${bookId}/test?${buildConfigUrlParams(config)}`, { replace: true });
      return;
    }
    
    // Returning user: check for due cards
    try {
      if (bookId) {
        // Fetch SRS batch in Quick mode to check due count
        const quickCheck = await fetchSrsBatch({
          bookId,
          mode: 'Quick',
          scope: 'full',
          difficulty: ['basic', 'medium', 'deep', 'mastery']
        });
        
        const dueToday = quickCheck.metadata.totalDueToday;
        
        if (dueToday > 0) {
          // Has due cards → instant Quick review
          const config: TestSessionConfig = {
            scope: 'full',
            difficulty: ['basic', 'medium', 'deep', 'mastery'],
            length: null, // Whatever is due
            mode: 'Quick'
          };
          
          setTestSessionConfig(config);
          setCurrentView('TESTING');
          if (bookId) navigate(`/book/${bookId}/test?${buildConfigUrlParams(config)}`, { replace: true });
          return;
        }
      }
    } catch (error) {
      console.debug('Could not check due cards, falling back to standard mode');
    }
    
    // Nothing due → continue where they left off
    // Calculate last read chapter from progress
    let lastReadChapter = 3;
    if (progress?.chapterBreakdown) {
      const inProgressOrMastered = progress.chapterBreakdown
        .filter(c => c.status === 'IN_PROGRESS' || c.status === 'MASTERED')
        .map(c => c.chapterIndex + 1); // Convert to 1-indexed
      if (inProgressOrMastered.length > 0) {
        lastReadChapter = Math.max(...inProgressOrMastered);
      }
    }
    
    const nextScopeEnd = Math.min(lastReadChapter + 2, totalChapters);
    const chapterRange = Array.from({ length: nextScopeEnd }, (_, i) => i + 1);
    
    const config: TestSessionConfig = {
      scope: 'chapters',
      chapters: chapterRange,
      difficulty: ['basic', 'medium', 'deep'], // Mixed difficulty for returning users
      length: 12,
      mode: 'Standard'
    };
    
    setTestSessionConfig(config);
    setCurrentView('TESTING');
    if (bookId) navigate(`/book/${bookId}/test?${buildConfigUrlParams(config)}`, { replace: true });
  };

  /**
   * Open test config modal (gear button click)
   * This is a true modal overlay - doesn't change view or URL
   */
  const handleOpenTestSetup = (book: BookRecommendation | BookDetails) => {
    const bookId = (book as any).id;
    const chapters = (book as any).chapters || [];
    
    const details: BookDetails = 'longDescription' in book ? book : {
      ...book,
      longDescription: (book as any).description || "This is an uploaded textbook.",
      chapters: chapters,
      id: bookId,
      concepts: (book as any).concepts || []
    };
    
    setConfigModalBook(details);
    setShowConfigModal(true);
  };

  const handleStartReading = (chapterIndex: number) => {
    // When user explicitly starts reading, we want URL updates from chapter changes
    isInitialMount.current = false;
    setReadingChapterIndex(chapterIndex);
    setCurrentView('READING');
    // Update URL to reflect chapter view
    if (selectedBook?.id) {
      navigate(`/book/${selectedBook.id}/chapter/${chapterIndex + 1}`, { replace: true });
    }
  };

  const handleCloseReader = () => {
    setCurrentView('DETAILS');
    // Keep selectedBook so we go back to book details, not the main list
    if (selectedBook?.id) {
      navigate(`/book/${selectedBook.id}`, { replace: true });
    }
  };

  const handleNavHome = () => {
    setSelectedBook(null);
    setCurrentView('HOME');
    navigate('/app', { replace: true });
  };

  const handleNavDashboard = () => {
    setCurrentView('DASHBOARD');
    navigate('/dashboard', { replace: true });
  };

  // Fetch books on mount
  useEffect(() => {
    fetchBooks();
  }, []);

  // Handle URL params for deep linking
  useEffect(() => {
    if (initialBookId && books.length > 0 && !selectedBook) {
      const book = books.find(b => b.id === initialBookId);
      if (book) {
        // For deep linking to a chapter or test, we need to load book details but NOT change view to DETAILS
        // The view should stay as READING or TESTING (set by getInitialView)
        const isChapterDeepLink = initialChapter !== undefined;
        const isTestDeepLink = initialView === 'testing';
        
        // Load book details without changing view
        const bookId = (book as any).id;
        const chapters = (book as any).chapters || [];
        const concepts = (book as any).concepts || [];
        
        const details: BookDetails = {
          ...book,
          longDescription: (book as any).description || "This is an uploaded textbook.",
          chapters: chapters,
          id: bookId,
          concepts: concepts
        };
        
        setSelectedBook(details);
        
        // Only set view to DETAILS if NOT a chapter or test deep link
        if (!isChapterDeepLink && !isTestDeepLink) {
          setCurrentView('DETAILS');
        }
        // If it IS a chapter/test deep link, the view is already set from getInitialView
      }
    }
  }, [initialBookId, initialChapter, initialView, books.length]);

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

  // Handle chapter change from ReaderView (update URL)
  const handleChapterChange = useCallback((chapterIndex: number) => {
    // Skip URL update on initial mount (when loading from deep link)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    setReadingChapterIndex(chapterIndex);
    if (selectedBook?.id) {
      navigate(`/book/${selectedBook.id}/chapter/${chapterIndex + 1}`, { replace: true });
    }
  }, [selectedBook?.id, navigate]);

  // Render Reader View Overlay (Hides Navbar)
  if (currentView === 'READING') {
    if (selectedBook) {
      return (
        <ReaderView 
          book={selectedBook} 
          initialChapterIndex={readingChapterIndex} 
          onClose={handleCloseReader}
          onChapterChange={handleChapterChange}
        />
      );
    } else {
      // Deep link loading state - book not loaded yet
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#3E2723]">
          <Loader2 className="w-16 h-16 text-brand-orange animate-spin mb-6" />
          <h2 className="text-2xl font-bold text-white">Loading Chapter...</h2>
          <p className="text-brand-cream/70 mt-2">Please wait while we fetch the book</p>
        </div>
      );
    }
  }

  // Render Test Suite Overlay (Hides Navbar)
  if (currentView === 'TESTING' && selectedBook) {
    return (
      <>
        <TestSuite 
          book={selectedBook} 
          onClose={() => {
            setTestSessionConfig(defaultTestConfig);
            setCurrentView('DETAILS');
          }}
          initialConfig={testSessionConfig}
        />
        {/* First-time tooltip */}
        {showFirstTimeTooltip && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="bg-green-600/90 backdrop-blur-sm text-white px-5 py-3 rounded-xl shadow-lg shadow-green-500/30 flex items-center gap-2 text-sm font-medium">
              <span>We'll start with the first three chapters to avoid spoilers ✓</span>
              <button 
                onClick={() => setShowFirstTimeTooltip(false)}
                className="ml-2 opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    // Removed bg-gradient here because the background is now handled in App.tsx with the image
    <div className="min-h-screen w-full bg-transparent text-brand-cream overflow-y-auto">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full px-4 md:px-12 py-3 md:py-4 flex items-center justify-between bg-[#5D4037]/60 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={handleNavHome}>
          <div className="bg-brand-orange p-1.5 md:p-2 rounded-lg shadow-lg shadow-brand-orange/20">
             <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-bold tracking-tight text-white">QuickBook</span>
        </div>

        <div className="hidden md:flex items-center gap-8 font-medium text-brand-cream/90">
          <button onClick={handleNavHome} className={`hover:text-brand-orange transition-colors shadow-sm ${currentView === 'HOME' ? 'text-white font-bold' : ''}`}>Library</button>
          <button onClick={handleNavDashboard} className={`hover:text-brand-orange transition-colors shadow-sm ${currentView === 'DASHBOARD' ? 'text-white font-bold' : ''}`}>My Dashboard</button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 pl-2 pr-4 py-1.5 rounded-full transition-colors border border-white/10" onClick={handleRequestLogin}>
              <div className="w-8 h-8 bg-gradient-to-br from-brand-orange to-brand-darkOrange rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner">
                ?
              </div>
              <span className="text-sm font-medium hidden sm:block text-white">Sign In</span>
            </button>
          )}
          {/* Mobile hamburger menu */}
          <button 
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden sticky top-[52px] z-30 bg-[#5D4037]/95 backdrop-blur-lg border-b border-white/10">
          <div className="flex flex-col px-4 py-3 gap-2">
            <button 
              onClick={() => { handleNavHome(); setMobileMenuOpen(false); }} 
              className={`text-left px-4 py-2 rounded-lg transition-colors ${currentView === 'HOME' ? 'bg-brand-orange/20 text-white font-bold' : 'text-brand-cream/90 hover:bg-white/10'}`}
            >
              Library
            </button>
            <button 
              onClick={() => { handleNavDashboard(); setMobileMenuOpen(false); }} 
              className={`text-left px-4 py-2 rounded-lg transition-colors ${currentView === 'DASHBOARD' ? 'bg-brand-orange/20 text-white font-bold' : 'text-brand-cream/90 hover:bg-white/10'}`}
            >
              My Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="px-4 md:px-12 py-6 md:py-10 max-w-7xl mx-auto">
        
        {currentView === 'DASHBOARD' ? (
          <Dashboard 
            progressData={progressData}
            loading={loadingProgress}
            onBack={handleNavHome}
            onContinue={(bookTitle) => {
              setQuery(bookTitle);
              setSelectedBook(null);
              setCurrentView('HOME');
              fetchBooks(bookTitle);
            }}
            onInstantStart={async (bookTitle) => {
              // Find progress data which contains bookId
              const progress = progressData.find(p => p.bookTitle === bookTitle);
              if (progress?.bookId) {
                // Look up full book details from books array
                const fullBook = books.find(b => (b as any).id === progress.bookId);
                const chapters = (fullBook as any)?.chapters || progress.chapterBreakdown.map((_, i) => `Chapter ${i + 1}`);
                const concepts = (fullBook as any)?.concepts || progress.concepts.map(c => c.name);
                
                // Construct BookDetails with full data
                const details: BookDetails = {
                  id: progress.bookId,
                  title: progress.bookTitle,
                  author: (fullBook as any)?.author || '',
                  description: (fullBook as any)?.description || '',
                  rating: 0,
                  longDescription: '',
                  chapters: chapters,
                  concepts: concepts
                };
                
                // Determine smart config based on progress
                const totalChapters = progress.chapterBreakdown.length;
                const isFirstTime = progress.overallMastery === 0;
                
                // Default config (will be overridden if needed)
                let config: TestSessionConfig = {
                  scope: 'chapters',
                  chapters: [1, 2, 3].filter(c => c <= totalChapters),
                  difficulty: ['medium'],
                  length: 12,
                  mode: 'Standard'
                };
                
                if (!isFirstTime) {
                  // Returning user: try Quick mode if due cards exist
                  try {
                    const quickCheck = await fetchSrsBatch({
                      bookId: progress.bookId,
                      mode: 'Quick',
                      scope: 'full',
                      difficulty: ['basic', 'medium', 'deep', 'mastery']
                    });
                    if (quickCheck.metadata.totalDueToday > 0) {
                      config = {
                        scope: 'full',
                        difficulty: ['basic', 'medium', 'deep', 'mastery'],
                        length: null,
                        mode: 'Quick'
                      };
                    } else {
                      // No due cards - continue where they left off
                      let lastReadChapter = 3;
                      const inProgressOrMastered = progress.chapterBreakdown
                        .filter(c => c.status === 'IN_PROGRESS' || c.status === 'MASTERED')
                        .map(c => c.chapterIndex + 1);
                      if (inProgressOrMastered.length > 0) {
                        lastReadChapter = Math.max(...inProgressOrMastered);
                      }
                      const nextScopeEnd = Math.min(lastReadChapter + 2, totalChapters);
                      const chapterRange = Array.from({ length: nextScopeEnd }, (_, i) => i + 1);
                      
                      config = {
                        scope: 'chapters',
                        chapters: chapterRange,
                        difficulty: ['basic', 'medium', 'deep'],
                        length: 12,
                        mode: 'Standard'
                      };
                    }
                  } catch {
                    // Fallback on error - use default config set above
                  }
                }
                
                // Set config FIRST, then navigate - pass config in URL params
                setSelectedBook(details);
                setTestSessionConfig(config);
                setCurrentView('TESTING');
                
                navigate(`/book/${progress.bookId}/test?${buildConfigUrlParams(config)}`, { replace: true });
              }
            }}
            onOpenTestSetup={(bookTitle) => {
              // Find the full book from our books list (has chapters/concepts)
              const progress = progressData.find(p => p.bookTitle === bookTitle);
              if (progress?.bookId) {
                // Look up full book details from books array
                const fullBook = books.find(b => (b as any).id === progress.bookId);
                if (fullBook) {
                  handleOpenTestSetup(fullBook);
                } else {
                  // Fallback if book not in list (shouldn't happen)
                  const bookInfo = {
                    id: progress.bookId,
                    title: progress.bookTitle,
                    author: '',
                    description: '',
                    chapters: progress.chapterBreakdown.map((_, i) => `Chapter ${i + 1}`),
                    concepts: progress.concepts.map(c => c.name)
                  };
                  handleOpenTestSetup(bookInfo as any);
                }
              }
            }}
            onRead={(bookTitle) => {
              // Find the full book from our books list
              const progress = progressData.find(p => p.bookTitle === bookTitle);
              if (progress?.bookId) {
                // Look up full book details from books array
                const fullBook = books.find(b => (b as any).id === progress.bookId);
                const chapters = (fullBook as any)?.chapters || progress.chapterBreakdown.map((_, i) => `Chapter ${i + 1}`);
                const concepts = (fullBook as any)?.concepts || progress.concepts.map(c => c.name);
                
                const details: BookDetails = {
                  id: progress.bookId,
                  title: progress.bookTitle,
                  author: (fullBook as any)?.author || '',
                  description: (fullBook as any)?.description || '',
                  rating: 0,
                  longDescription: '',
                  chapters: chapters,
                  concepts: concepts
                };
                
                setSelectedBook(details);
                setCurrentView('READING');
              }
            }}
          />
        ) : currentView === 'DETAILS' && selectedBook ? (
          // DETAIL VIEW
          <BookDetail 
            book={selectedBook} 
            progress={progressData.find(p => p.bookTitle === selectedBook.title) || null}
            loadingProgress={loadingProgress}
            onBack={handleNavHome} 
            onRead={handleStartReading}
            onTest={() => {
              // Use saved config from localStorage
              const savedConfig = selectedBook.id ? getSavedTestConfig(selectedBook.id) : defaultTestConfig;
              setTestSessionConfig(savedConfig);
              setCurrentView('TESTING');
              if (selectedBook.id) {
                navigate(`/book/${selectedBook.id}/test?${buildConfigUrlParams(savedConfig)}`, { replace: true });
              }
            }}
            onInstantStart={() => {
              const progress = progressData.find(p => p.bookTitle === selectedBook.title) || null;
              handleInstantStart(selectedBook, progress);
            }}
            onOpenTestSetup={() => handleOpenTestSetup(selectedBook)}
            showSuccess={showSuccess}
            showError={showError}
          />
        ) : currentView === 'DETAILS' && !selectedBook ? (
          // DETAILS deep link loading state
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-16 h-16 text-brand-orange animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-white">Loading Book...</h2>
          </div>
        ) : (
          // LIST VIEW (HOME)
          <>
            {/* Search Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 mb-4 md:mb-6">
              <div>
                <h2 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {query ? `Results for "${query}"` : 'Discover Your Next Read'}
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
                {books.map((book, idx) => (
                  <BookCard 
                    key={idx} 
                    book={book} 
                    onClick={handleBookClick} 
                    onTest={handleQuickTest}
                    viewMode={viewMode}
                  />
                ))}
                {books.length === 0 && !loading && (
                   <div className="col-span-full text-center py-20 text-white/60">
                      No books found. Upload a book to get started.
                   </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      
      {/* Toast container - persists across view changes */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      
      {/* Test Config Modal - settings cog opens this (config only, no test start) */}
      <TestConfigModal
        book={configModalBook!}
        isOpen={showConfigModal && !!configModalBook}
        onClose={() => {
          setShowConfigModal(false);
          setConfigModalBook(null);
        }}
      />
    </div>
  );
};