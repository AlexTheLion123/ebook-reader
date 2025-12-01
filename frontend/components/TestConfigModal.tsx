import React, { useState, useEffect } from 'react';
import { X, BookOpen, BrainCircuit, Timer, Check, Tag, Loader2 } from 'lucide-react';
import { BookDetails, TestSessionConfig } from '../types';
import { fetchQuestionMetadata, QuestionMetadataResponse } from '../services/backendService';

// Storage key for test config per book
const getStorageKey = (bookId: string) => `quickbook-test-config-${bookId}`;

// Default config
const defaultConfig: TestSessionConfig = {
  scope: 'full',
  chapters: undefined,
  concepts: undefined,
  difficulty: ['medium'],
  length: 12,
  mode: 'Standard'
};

// Get saved config from localStorage
export const getSavedTestConfig = (bookId: string): TestSessionConfig => {
  try {
    const saved = localStorage.getItem(getStorageKey(bookId));
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load test config:', e);
  }
  return defaultConfig;
};

// Save config to localStorage
export const saveTestConfig = (bookId: string, config: TestSessionConfig) => {
  try {
    localStorage.setItem(getStorageKey(bookId), JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save test config:', e);
  }
};

interface TestConfigModalProps {
  book: BookDetails;
  isOpen: boolean;
  onClose: () => void;
}

const TEST_MODE_CONFIG = {
  QUICK: { label: 'Quick', targetQuestions: 6 },
  STANDARD: { label: 'Standard', targetQuestions: 12 },
  THOROUGH: { label: 'Thorough', targetQuestions: 24 }
};

export const TestConfigModal: React.FC<TestConfigModalProps> = ({ book, isOpen, onClose }) => {
  // Return early if not open or no book
  if (!isOpen || !book) {
    return null;
  }
  
  return <TestConfigModalContent book={book} onClose={onClose} />;
};

// Separate component to ensure book is always defined
const TestConfigModalContent: React.FC<{
  book: BookDetails;
  onClose: () => void;
}> = ({ book, onClose }) => {
  // Load saved config on mount
  const savedConfig = book.id ? getSavedTestConfig(book.id) : defaultConfig;
  
  // Config State
  const [scope, setScope] = useState<'FULL' | 'CHAPTER' | 'CONCEPTS'>(() => {
    if (savedConfig.scope === 'chapters') return 'CHAPTER';
    if (savedConfig.scope === 'concepts') return 'CONCEPTS';
    return 'FULL';
  });
  const [selectedChapters, setSelectedChapters] = useState<number[]>(() => 
    savedConfig.chapters?.map(c => c - 1) || []
  );
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>(() => 
    savedConfig.concepts || []
  );
  const [difficulty, setDifficulty] = useState<'BASIC' | 'MEDIUM' | 'DEEP' | 'MASTERY'>(() => {
    const d = savedConfig.difficulty?.[0]?.toUpperCase() as any;
    return ['BASIC', 'MEDIUM', 'DEEP', 'MASTERY'].includes(d) ? d : 'MEDIUM';
  });
  const [testMode, setTestMode] = useState<'QUICK' | 'STANDARD' | 'THOROUGH'>(() => {
    const m = savedConfig.mode?.toUpperCase() as any;
    return ['QUICK', 'STANDARD', 'THOROUGH'].includes(m) ? m : 'STANDARD';
  });

  // Question Metadata State
  const [questionMetadata, setQuestionMetadata] = useState<QuestionMetadataResponse | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Shift-click for range selection
  const [lastInteractionIndex, setLastInteractionIndex] = useState<number | null>(null);

  // Fetch metadata on mount
  useEffect(() => {
    const loadMetadata = async () => {
      if (!book?.id) {
        setLoadingMetadata(false);
        return;
      }
      
      try {
        setLoadingMetadata(true);
        const metadata = await fetchQuestionMetadata(book.id);
        setQuestionMetadata(metadata);
      } catch (error) {
        console.error('Failed to load question metadata:', error);
      } finally {
        setLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [book?.id]);

  // Helper to check if a chapter has questions
  const chapterHasQuestions = (chapterIndex: number): boolean => {
    if (!questionMetadata) return true;
    return questionMetadata.availableChapters.includes(chapterIndex + 1);
  };

  const handleChapterClick = (idx: number, e: React.MouseEvent) => {
    const hasQuestions = chapterHasQuestions(idx);
    if (!hasQuestions) return;

    if (e.shiftKey && lastInteractionIndex !== null) {
      const start = Math.min(lastInteractionIndex, idx);
      const end = Math.max(lastInteractionIndex, idx);
      const rangeIndices = [];
      for (let i = start; i <= end; i++) {
        if (chapterHasQuestions(i)) {
          rangeIndices.push(i);
        }
      }
      setSelectedChapters(prev => {
        const combined = new Set([...prev, ...rangeIndices]);
        return Array.from(combined).sort((a, b) => a - b);
      });
    } else {
      setSelectedChapters(prev => 
        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx].sort((a, b) => a - b)
      );
    }
    setLastInteractionIndex(idx);
  };

  const toggleAllChapters = () => {
    const available = questionMetadata?.availableChapters.map(c => c - 1) || 
      book.chapters.map((_, i) => i);
    
    if (selectedChapters.length === available.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(available);
    }
  };

  const toggleConcept = (concept: string) => {
    setSelectedConcepts(prev => 
      prev.includes(concept) ? prev.filter(c => c !== concept) : [...prev, concept]
    );
  };

  const toggleAllConcepts = () => {
    if (selectedConcepts.length === book.concepts?.length) {
      setSelectedConcepts([]);
    } else {
      setSelectedConcepts(book.concepts || []);
    }
  };

  // Build current config from state
  const buildConfig = (): TestSessionConfig => ({
    scope: scope === 'FULL' ? 'full' : scope === 'CHAPTER' ? 'chapters' : 'concepts',
    chapters: scope === 'CHAPTER' && selectedChapters.length > 0 
      ? selectedChapters.map(i => i + 1) 
      : undefined,
    concepts: scope === 'CONCEPTS' && selectedConcepts.length > 0 
      ? selectedConcepts 
      : undefined,
    difficulty: [difficulty.toLowerCase() as 'basic' | 'medium' | 'deep' | 'mastery'],
    length: TEST_MODE_CONFIG[testMode].targetQuestions,
    mode: testMode === 'QUICK' ? 'Quick' : testMode === 'STANDARD' ? 'Standard' : 'Thorough'
  });

  // Save config on every change
  useEffect(() => {
    if (book.id) {
      saveTestConfig(book.id, buildConfig());
    }
  }, [scope, selectedChapters, selectedConcepts, difficulty, testMode, book.id]);

  const handleDone = () => {
    // Config is already saved via useEffect, just close
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#3E2723]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#A1887F]/30 overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#2a1d18]/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-brand-orange/20 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-brand-orange" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white leading-none">Test Settings</h3>
              <p className="text-sm text-brand-cream/50 mt-1">{book.title}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-brand-cream/60 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Scope */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Scope
            </label>
            <div className={`grid gap-4 ${book.concepts && book.concepts.length > 0 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2'}`}>
              <button 
                onClick={() => setScope('FULL')}
                className={`p-4 rounded-xl border transition-all text-left group ${scope === 'FULL' ? 'bg-brand-orange/20 border-brand-orange text-white' : 'bg-black/20 border-white/5 text-brand-cream/60 hover:bg-white/5'}`}
              >
                <div className="font-bold text-base leading-tight">Full Book</div>
                <div className="text-xs opacity-70 mt-1">
                  {questionMetadata 
                    ? `${questionMetadata.availableChapters.length} chapters`
                    : 'Review all.'
                  }
                </div>
              </button>
              <button 
                onClick={() => setScope('CHAPTER')}
                className={`p-4 rounded-xl border transition-all text-left group ${scope === 'CHAPTER' ? 'bg-brand-orange/20 border-brand-orange text-white' : 'bg-black/20 border-white/5 text-brand-cream/60 hover:bg-white/5'}`}
              >
                <div className="font-bold text-base leading-tight">Chapter Select</div>
                <div className="text-xs opacity-70 mt-1">Specific sections.</div>
              </button>
              {book.concepts && book.concepts.length > 0 && (
                <button 
                  onClick={() => setScope('CONCEPTS')}
                  className={`p-4 rounded-xl border transition-all text-left group ${scope === 'CONCEPTS' ? 'bg-brand-orange/20 border-brand-orange text-white' : 'bg-black/20 border-white/5 text-brand-cream/60 hover:bg-white/5'}`}
                >
                  <div className="font-bold text-base leading-tight">Concepts</div>
                  <div className="text-xs opacity-70 mt-1">Themes, motifs...</div>
                </button>
              )}
            </div>
          </div>

          {/* Chapter Selection */}
          {scope === 'CHAPTER' && (
            <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden animate-fade-in">
              <div className="p-3 bg-white/5 flex justify-between items-center border-b border-white/5">
                <span className="text-xs font-bold text-brand-cream/60 uppercase tracking-wider">Select Chapters</span>
                <button 
                  onClick={toggleAllChapters}
                  className="text-[10px] font-bold text-brand-orange hover:text-white transition-colors uppercase"
                >
                  {selectedChapters.length === (questionMetadata?.availableChapters.length || book.chapters.length) ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto p-1.5 custom-scrollbar">
                {loadingMetadata ? (
                  <div className="flex items-center justify-center py-4 text-brand-cream/50">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-xs">Loading chapters...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5">
                    {book.chapters.map((chap, idx) => {
                      const isSelected = selectedChapters.includes(idx);
                      const hasQuestions = chapterHasQuestions(idx);
                      
                      return (
                        <button
                          key={idx}
                          onClick={(e) => handleChapterClick(idx, e)}
                          disabled={!hasQuestions}
                          className={`w-full text-left px-1.5 py-1 rounded-lg text-sm transition-all flex items-center justify-between group ${
                            !hasQuestions
                              ? 'opacity-40 cursor-not-allowed text-brand-cream/40 border border-transparent'
                              : isSelected 
                                ? 'bg-brand-orange/10 border border-brand-orange/30 text-white' 
                                : 'text-brand-cream/70 border border-transparent hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className={`w-[18px] h-[18px] rounded flex items-center justify-center border transition-colors shrink-0 ${
                              !hasQuestions
                                ? 'border-white/10 bg-white/5'
                                : isSelected 
                                  ? 'bg-brand-orange border-brand-orange' 
                                  : 'border-white/20'
                            }`}>
                              {isSelected && hasQuestions && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                            </div>
                            <span className="truncate flex-1 text-left font-medium">
                              <span className="font-mono text-xs opacity-50 mr-2">{idx + 1}.</span>
                              {chap}
                            </span>
                          </div>
                          {!hasQuestions && (
                            <span className="text-[10px] text-brand-cream/30 ml-2 shrink-0 italic">
                              No questions
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-2 bg-black/20 text-center border-t border-white/5">
                <span className="text-[10px] text-brand-cream/40">
                  {selectedChapters.length} of {questionMetadata?.availableChapters.length || book.chapters.length} chapters selected
                </span>
              </div>
            </div>
          )}

          {/* Concepts Selection */}
          {scope === 'CONCEPTS' && book.concepts && book.concepts.length > 0 && (
            <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden animate-fade-in">
              <div className="p-3 bg-white/5 flex justify-between items-center border-b border-white/5">
                <span className="text-xs font-bold text-brand-cream/60 uppercase tracking-wider">Select Concepts</span>
                <button 
                  onClick={toggleAllConcepts}
                  className="text-[10px] font-bold text-brand-orange hover:text-white transition-colors uppercase"
                >
                  {selectedConcepts.length === book.concepts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto p-1.5 custom-scrollbar">
                <div className="grid grid-cols-2 gap-0.5">
                  {book.concepts.map((concept) => {
                    const isSelected = selectedConcepts.includes(concept);
                    return (
                      <button
                        key={concept}
                        onClick={() => toggleConcept(concept)}
                        className={`px-1.5 py-1 rounded-lg text-sm transition-all flex items-center gap-2 ${
                          isSelected 
                            ? 'bg-brand-orange/10 border border-brand-orange/30 text-white' 
                            : 'text-brand-cream/70 border border-transparent hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className={`w-[18px] h-[18px] rounded flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected ? 'bg-brand-orange border-brand-orange' : 'border-white/20'
                        }`}>
                          {isSelected && <Tag className="w-3 h-3 text-white" />}
                        </div>
                        <span className="truncate text-left font-medium">{concept}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-2 bg-black/20 text-center border-t border-white/5">
                <span className="text-[10px] text-brand-cream/40">
                  {selectedConcepts.length} concepts selected
                </span>
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase tracking-wider flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" /> Difficulty
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['BASIC', 'MEDIUM', 'DEEP', 'MASTERY'] as const).map((level) => (
                <button 
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`p-3 rounded-xl border transition-all text-center ${difficulty === level ? 'bg-brand-orange/20 border-brand-orange text-white' : 'bg-black/20 border-white/5 text-brand-cream/60 hover:bg-white/5'}`}
                >
                  <div className="font-bold capitalize text-sm">{level.toLowerCase()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Test Mode (Length) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase tracking-wider flex items-center gap-2">
              <Timer className="w-4 h-4" /> Length
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['QUICK', 'STANDARD', 'THOROUGH'] as const).map((mode) => (
                <button 
                  key={mode}
                  onClick={() => setTestMode(mode)}
                  className={`p-3 rounded-xl border transition-all text-center ${testMode === mode ? 'bg-brand-orange/20 border-brand-orange text-white' : 'bg-black/20 border-white/5 text-brand-cream/60 hover:bg-white/5'}`}
                >
                  <div className="font-bold text-sm">{TEST_MODE_CONFIG[mode].targetQuestions} Qs</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-[#2a1d18]/30 shrink-0">
          <button 
            onClick={handleDone}
            className="w-full bg-brand-orange hover:bg-brand-darkOrange text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-orange/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
