import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Trophy, ArrowRight, BrainCircuit, BookOpen, BarChart2, Timer, GraduationCap, Target, RefreshCw, ArrowLeft, HelpCircle, Tag, Lightbulb, Loader2, RotateCcw, ThumbsDown, ThumbsUp, Zap } from 'lucide-react';
import { BookDetails, Question, QuestionType, AssessmentQuestion, QuestionHint, SrsRating, TestMode, AssessmentQuestionWithSrs } from '../types';
import { HintSidebar } from './HintSidebar';
import { fetchQuestions, evaluateAnswer, fetchQuestionMetadata, QuestionMetadataResponse } from '../services/backendService';
import { fetchSrsBatch, submitSrsAnswer, RATING_CONFIG } from '../services/srsService';

interface TestSuiteProps {
  book: BookDetails;
  onClose: () => void;
}

type TestStep = 'CONFIG' | 'LOADING' | 'QUIZ' | 'RESULTS';

export const TestSuite: React.FC<TestSuiteProps> = ({ book, onClose }) => {
  const [step, setStep] = useState<TestStep>('CONFIG');
  
  // Config State
  const [scope, setScope] = useState<'FULL' | 'CHAPTER' | 'CONCEPTS'>('FULL');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [lastInteractionIndex, setLastInteractionIndex] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'BASIC' | 'MEDIUM' | 'DEEP' | 'MASTERY'>('MEDIUM');
  const [testMode, setTestMode] = useState<'QUICK' | 'STANDARD' | 'THOROUGH'>('QUICK');

  // Questions State (fetched from API)
  const [questions, setQuestions] = useState<AssessmentQuestionWithSrs[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // SRS State
  const [useSrs, setUseSrs] = useState(true); // Toggle between SRS and legacy mode
  const [srsDueCount, setSrsDueCount] = useState(0);
  const [srsNewCount, setSrsNewCount] = useState(0);
  const [selectedRating, setSelectedRating] = useState<SrsRating | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [allCaughtUp, setAllCaughtUp] = useState(false);

  // Question Metadata State (which chapters have questions)
  const [questionMetadata, setQuestionMetadata] = useState<QuestionMetadataResponse | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Fetch question metadata on mount to know which chapters have questions
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
        // Not critical - we can still let users try, just won't show availability
      } finally {
        setLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [book?.id]);

  // Helper to check if a chapter has questions
  const chapterHasQuestions = (chapterIndex: number): boolean => {
    if (!questionMetadata) return true; // Assume available if no metadata
    return questionMetadata.availableChapters.includes(chapterIndex + 1); // Convert to 1-indexed
  };

  // Get question count for a chapter
  const getChapterQuestionCount = (chapterIndex: number): number => {
    if (!questionMetadata) return 0;
    return questionMetadata.questionsByChapter[chapterIndex + 1] || 0;
  };

  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{questionId: string, correct: boolean, feedback?: string}[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds

  // Hints State
  const [revealedHintIndex, setRevealedHintIndex] = useState(-1); // -1 = no hints shown
  const [isHintSidebarOpen, setIsHintSidebarOpen] = useState(false);

  // AI Assist State
  const [isAiAssistOpen, setIsAiAssistOpen] = useState(false);

  // Timer Effect
  useEffect(() => {
    if (step !== 'QUIZ') return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Test mode configurations
  const TEST_MODE_CONFIG = {
    QUICK: { targetQuestions: 5, label: 'Quick', description: '~5 questions', subtext: 'Fast review' },
    STANDARD: { targetQuestions: 15, label: 'Medium', description: '~15 questions', subtext: 'Balanced' },
    THOROUGH: { targetQuestions: 30, label: 'Thorough', description: '~30 questions', subtext: 'Comprehensive' },
  };

  // Derived State
  const currentQuestion = questions[currentQuestionIndex] || null;
  const currentModeConfig = TEST_MODE_CONFIG[testMode];
  const totalQuestions = Math.min(questions.length, currentModeConfig.targetQuestions);
  const progress = totalQuestions > 0 ? ((currentQuestionIndex) / totalQuestions) * 100 : 0;

  // Get available hints for current question
  const currentHints = currentQuestion?.hints || [];
  const hasMoreHints = revealedHintIndex < currentHints.length - 1;

  // Chapter Selection Helpers
  const toggleChapter = (index: number) => {
    // Only allow toggling chapters that have questions
    if (!chapterHasQuestions(index)) return;
    
    setSelectedChapters(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleChapterClick = (index: number, e: React.MouseEvent) => {
    // Don't allow clicking on chapters without questions
    if (!chapterHasQuestions(index)) return;
    
    if (e.shiftKey && lastInteractionIndex !== null) {
      const start = Math.min(lastInteractionIndex, index);
      const end = Math.max(lastInteractionIndex, index);
      const range: number[] = [];
      for (let i = start; i <= end; i++) range.push(i);

      const isAnchorSelected = selectedChapters.includes(lastInteractionIndex);

      setSelectedChapters(prev => {
        if (isAnchorSelected) {
          // Select all in range
          const set = new Set([...prev, ...range]);
          return Array.from(set).sort((a, b) => a - b);
        } else {
          // Deselect all in range
          return prev.filter(i => !range.includes(i));
        }
      });
      setLastInteractionIndex(index);
    } else {
      toggleChapter(index);
      setLastInteractionIndex(index);
    }
  };

  const toggleAllChapters = () => {
    // Only select chapters that have questions
    const chaptersWithQuestions = book.chapters
      .map((_, i) => i)
      .filter(i => chapterHasQuestions(i));
    
    if (selectedChapters.length === chaptersWithQuestions.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(chaptersWithQuestions);
    }
  };

  // Concepts Selection Helpers
  const toggleConcept = (concept: string) => {
    setSelectedConcepts(prev => 
      prev.includes(concept) 
        ? prev.filter(c => c !== concept)
        : [...prev, concept]
    );
  };

  const toggleAllConcepts = () => {
    if (!book.concepts) return;
    if (selectedConcepts.length === book.concepts.length) {
      setSelectedConcepts([]);
    } else {
      setSelectedConcepts([...book.concepts]);
    }
  };

  // Fetch questions from API (SRS or legacy mode)
  const loadQuestions = async () => {
    if (!book.id) {
      setLoadError('Book ID not available');
      return;
    }

    setLoadingQuestions(true);
    setLoadError(null);
    setAllCaughtUp(false);

    try {
      // Build chapter filter based on scope
      let chapters: number[] | undefined;
      if (scope === 'CHAPTER' && selectedChapters.length > 0) {
        // Convert 0-indexed to 1-indexed chapter numbers
        chapters = selectedChapters.map(i => i + 1);
      }

      if (useSrs) {
        // Use SRS-based fetching
        // Map UI scope values to API scope values
        const apiScope = scope === 'FULL' ? 'full' : scope === 'CHAPTER' ? 'chapters' : 'concepts';
        
        const response = await fetchSrsBatch({
          bookId: book.id,
          mode: testMode === 'QUICK' ? 'Quick' : testMode === 'STANDARD' ? 'Standard' : 'Thorough',
          scope: apiScope,
          chapters,
          concepts: scope === 'CONCEPTS' ? selectedConcepts : undefined,
          difficulty: [difficulty.toLowerCase() as 'basic' | 'medium' | 'deep' | 'mastery'],
        });

        // Check if all caught up (no questions to review)
        if (response.questions.length === 0) {
          if (testMode === 'QUICK') {
            // Quick mode: no due cards = all caught up!
            setAllCaughtUp(true);
            setLoadingQuestions(false);
            setStep('QUIZ'); // Show the "all caught up" message
            return;
          } else {
            setLoadError('No questions available for the selected criteria. Try a different chapter or difficulty.');
            setLoadingQuestions(false);
            return;
          }
        }

        // Map SRS response to our question format
        setQuestions(response.questions);
        setSrsDueCount(response.metadata.totalDueToday);
        setSrsNewCount(response.metadata.newToday);
        setLoadingQuestions(false);
        setStep('QUIZ');
      } else {
        // Legacy mode (non-SRS)
        const response = await fetchQuestions({
          bookId: book.id,
          chapters,
          difficulty: [difficulty.toLowerCase() as 'basic' | 'medium' | 'deep' | 'mastery'],
          limit: currentModeConfig.targetQuestions,
          shuffle: true,
        });

        if (response.questions.length === 0) {
          setLoadError('No questions found for the selected criteria. Try selecting different chapters or difficulty.');
          setLoadingQuestions(false);
          return;
        }

        // Convert to SRS format (without SRS data)
        setQuestions(response.questions.map(q => ({ ...q } as AssessmentQuestionWithSrs)));
        setLoadingQuestions(false);
        setStep('QUIZ');
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
      setLoadError('Failed to load questions. Please try again.');
      setLoadingQuestions(false);
    }
  };

  const handleStart = () => {
    // Reset quiz state
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnswers([]);
    setIsAnswerChecked(false);
    setSelectedOption(null);
    setTextAnswer('');
    setElapsedTime(0);
    setRevealedHintIndex(-1);
    setCurrentFeedback(null);
    setSelectedRating(null);
    setIsSubmittingRating(false);
    setAllCaughtUp(false);
    setSrsDueCount(0);
    setSrsNewCount(0);
    
    // Start loading questions
    setStep('LOADING');
    loadQuestions();
  };

  const handleCheckAnswer = async () => {
    if (!currentQuestion) return;
    
    const userAnswer = currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE'
      ? selectedOption || ''
      : textAnswer;

    // For MCQ, TRUE_FALSE - do local exact match (fast, no API call)
    if (currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE') {
      const isCorrect = userAnswer === currentQuestion.correctAnswer;
      if (isCorrect) setScore(prev => prev + 1);
      setAnswers(prev => [...prev, { questionId: currentQuestion.id, correct: isCorrect }]);
      setCurrentFeedback(isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${currentQuestion.correctAnswer}`);
      setIsAnswerChecked(true);
      return;
    }

    // For FILL_BLANK - check against correctAnswer and acceptableAnswers locally
    if (currentQuestion.type === 'FILL_BLANK') {
      const normalizedAnswer = userAnswer.trim().toLowerCase();
      const allAcceptable = [
        currentQuestion.correctAnswer.toLowerCase(),
        ...(currentQuestion.acceptableAnswers || []).map(a => a.toLowerCase())
      ];
      const isCorrect = allAcceptable.some(acceptable => 
        normalizedAnswer === acceptable || 
        normalizedAnswer.includes(acceptable) ||
        acceptable.includes(normalizedAnswer)
      );
      if (isCorrect) setScore(prev => prev + 1);
      setAnswers(prev => [...prev, { questionId: currentQuestion.id, correct: isCorrect }]);
      setCurrentFeedback(isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${currentQuestion.correctAnswer}`);
      setIsAnswerChecked(true);
      return;
    }

    // For SHORT_ANSWER, BRIEF_RESPONSE - use Bedrock AI evaluation
    setIsEvaluating(true);
    try {
      const result = await evaluateAnswer({
        question: currentQuestion.text,
        userAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        type: currentQuestion.type,
        acceptableAnswers: currentQuestion.acceptableAnswers,
        rubric: currentQuestion.rubric,
      });

      if (result.isCorrect) setScore(prev => prev + 1);
      setAnswers(prev => [...prev, { 
        questionId: currentQuestion.id, 
        correct: result.isCorrect,
        feedback: result.feedback 
      }]);
      setCurrentFeedback(result.feedback);
      setIsAnswerChecked(true);
    } catch (error) {
      console.error('Failed to evaluate answer:', error);
      // Fallback to showing as incorrect with error message
      setAnswers(prev => [...prev, { questionId: currentQuestion.id, correct: false }]);
      setCurrentFeedback('Unable to evaluate answer. Please try again.');
      setIsAnswerChecked(true);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRevealHint = () => {
    if (hasMoreHints) {
      setRevealedHintIndex(prev => prev + 1);
    }
  };

  // Handle SRS rating submission
  const handleRatingSelect = async (rating: SrsRating) => {
    if (!currentQuestion || !useSrs) return;
    
    setSelectedRating(rating);
    setIsSubmittingRating(true);

    try {
      const userAnswer = currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE'
        ? selectedOption || ''
        : textAnswer;

      await submitSrsAnswer({
        bookId: book.id!,
        questionId: currentQuestion.id,
        userAnswer,
        rating,
        questionFormat: currentQuestion.text.substring(0, 100), // Store a snippet of the question format
      });
    } catch (error) {
      console.error('Failed to submit SRS rating:', error);
      // Continue anyway - don't block the user
    } finally {
      setIsSubmittingRating(false);
      // Move to next question
      proceedToNext();
    }
  };

  const proceedToNext = () => {
    if (currentQuestionIndex + 1 >= totalQuestions) {
      setStep('RESULTS');
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsAnswerChecked(false);
      setSelectedOption(null);
      setTextAnswer('');
      setRevealedHintIndex(-1);
      setCurrentFeedback(null);
      setSelectedRating(null);
    }
  };

  const handleNext = () => {
    if (useSrs) {
      // In SRS mode, rating selection handles progression
      // This is a fallback for non-SRS mode
      proceedToNext();
    } else {
      proceedToNext();
    }
  };

  // Scroll config area if needed
  const renderConfig = () => {
    try {
      return (
    <div className="w-full max-w-2xl max-h-[90vh] bg-[#3E2723] rounded-2xl shadow-2xl border border-[#A1887F]/30 overflow-hidden relative z-10 animate-slide-up my-auto flex flex-col">
       <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#2a1d18]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-brand-orange/20 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-brand-orange" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white leading-none">Test Setup</h3>
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
       
       <div className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
        <div className="text-center space-y-1 mb-2">
            <h2 className="text-2xl font-bold text-white">Configure Assessment</h2>
            <p className="text-brand-cream/60">Customize the evaluation to match your learning goals.</p>
        </div>

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
                    ? `${questionMetadata.availableChapters.length} chapters · ${questionMetadata.totalQuestions} questions`
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
          <div className="mt-4 bg-black/20 rounded-xl border border-white/5 overflow-hidden animate-fade-in">
            <div className="p-3 bg-white/5 flex justify-between items-center border-b border-white/5">
               <span className="text-xs font-bold text-brand-cream/60 uppercase tracking-wider">Select Chapters</span>
               <button 
                 onClick={toggleAllChapters}
                 className="text-[10px] font-bold text-brand-orange hover:text-white transition-colors uppercase"
               >
                 {selectedChapters.length === (questionMetadata?.availableChapters.length || book.chapters.length) ? 'Deselect All' : 'Select All'}
               </button>
            </div>
            <div className="max-h-40 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {loadingMetadata ? (
                <div className="flex items-center justify-center py-4 text-brand-cream/50">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-xs">Loading chapters...</span>
                </div>
              ) : (
                book.chapters.map((chap, idx) => {
                  const isSelected = selectedChapters.includes(idx);
                  const hasQuestions = chapterHasQuestions(idx);
                  const questionCount = getChapterQuestionCount(idx);
                  
                  return (
                    <button
                      key={idx}
                      onClick={(e) => handleChapterClick(idx, e)}
                      disabled={!hasQuestions}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${
                        !hasQuestions
                          ? 'opacity-40 cursor-not-allowed text-brand-cream/40 border border-transparent'
                          : isSelected 
                            ? 'bg-brand-orange/10 border border-brand-orange/30 text-white' 
                            : 'text-brand-cream/70 border border-transparent hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          !hasQuestions
                            ? 'border-white/10 bg-white/5'
                            : isSelected 
                              ? 'bg-brand-orange border-brand-orange' 
                              : 'border-white/20'
                        }`}>
                          {isSelected && hasQuestions && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="truncate flex-1 text-left">
                          <span className="font-mono text-xs opacity-50 mr-2">{idx + 1}.</span>
                          {chap}
                        </span>
                      </div>
                      {hasQuestions ? (
                        <span className="text-[10px] text-brand-cream/40 ml-2 shrink-0">
                          {questionCount} Q
                        </span>
                      ) : (
                        <span className="text-[10px] text-brand-cream/30 ml-2 shrink-0 italic">
                          No questions
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="p-2 bg-black/20 text-center border-t border-white/5">
                <span className="text-[10px] text-brand-cream/40">
                   {selectedChapters.length} of {questionMetadata?.availableChapters.length || book.chapters.length} chapters selected
                   {questionMetadata && ` (${questionMetadata.totalQuestions} questions available)`}
                </span>
            </div>
          </div>
        )}

        {/* Concepts Selection */}
        {scope === 'CONCEPTS' && book.concepts && book.concepts.length > 0 && (
          <div className="mt-4 bg-black/20 rounded-xl border border-white/5 overflow-hidden animate-fade-in">
            <div className="p-3 bg-white/5 flex justify-between items-center border-b border-white/5">
               <span className="text-xs font-bold text-brand-cream/60 uppercase tracking-wider">Select Concepts</span>
               <button 
                 onClick={toggleAllConcepts}
                 className="text-[10px] font-bold text-brand-orange hover:text-white transition-colors uppercase"
               >
                 {selectedConcepts.length === book.concepts.length ? 'Deselect All' : 'Select All'}
               </button>
            </div>
            <div className="max-h-48 overflow-y-auto p-3 custom-scrollbar">
              <div className="grid grid-cols-2 gap-2">
                {book.concepts.map((concept) => {
                  const isSelected = selectedConcepts.includes(concept);
                  return (
                  <button
                    key={concept}
                    onClick={() => toggleConcept(concept)}
                    className={`px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2.5 ${
                      isSelected 
                        ? 'bg-brand-orange/10 border border-brand-orange/30 text-white' 
                        : 'text-brand-cream/70 border border-transparent hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                      isSelected ? 'bg-brand-orange border-brand-orange' : 'border-white/20'
                    }`}>
                       {isSelected && <Tag className="w-3 h-3 text-white" />}
                    </div>
                    <span className="truncate text-left">{concept}</span>
                  </button>
                )})}
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

        {/* Active Filters Row */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/5">
           <span className="text-[10px] font-bold text-brand-cream/40 uppercase tracking-widest mr-1">Active:</span>
           
           {/* Scope-based Chips */}
           {scope === 'FULL' && (
             <div className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-brand-cream border border-white/10 cursor-default">
                Full Book
             </div>
           )}

           {scope === 'CHAPTER' && selectedChapters.length === 0 && (
             <div className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-brand-cream border border-white/10 cursor-default">
                All Chapters
             </div>
           )}

           {scope === 'CHAPTER' && selectedChapters.length > 0 && (
             <>
               {selectedChapters.slice(0, 5).map(idx => (
                 <button 
                    key={idx}
                    onClick={() => setSelectedChapters(prev => prev.filter(i => i !== idx))}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-brand-orange/10 text-brand-orange border border-brand-orange/20 flex items-center gap-1.5 hover:bg-brand-orange/20 transition-colors group"
                 >
                    <span>Chap {idx + 1}</span>
                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                 </button>
               ))}
               {selectedChapters.length > 5 && (
                 <button 
                    onClick={() => setSelectedChapters(prev => prev.slice(0, 5))}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-brand-orange/10 text-brand-orange border border-brand-orange/20 flex items-center gap-1.5 hover:bg-brand-orange/20 transition-colors group"
                 >
                    <span>+{selectedChapters.length - 5} more</span>
                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                 </button>
               )}
             </>
           )}

           {scope === 'CONCEPTS' && selectedConcepts.length === 0 && (
             <div className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-brand-cream border border-white/10 cursor-default">
                All Concepts
             </div>
           )}

           {scope === 'CONCEPTS' && selectedConcepts.length > 0 && (
             <>
               {selectedConcepts.slice(0, 5).map(c => (
                 <button 
                    key={c}
                    onClick={() => setSelectedConcepts(prev => prev.filter(concept => concept !== c))}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-brand-orange/10 text-brand-orange border border-brand-orange/20 flex items-center gap-1.5 hover:bg-brand-orange/20 transition-colors group"
                 >
                    <span>{c}</span>
                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                 </button>
               ))}
               {selectedConcepts.length > 5 && (
                 <button 
                    onClick={() => setSelectedConcepts(prev => prev.slice(0, 5))}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-brand-orange/10 text-brand-orange border border-brand-orange/20 flex items-center gap-1.5 hover:bg-brand-orange/20 transition-colors group"
                 >
                    <span>+{selectedConcepts.length - 5} more</span>
                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                 </button>
               )}
             </>
           )}

           {/* Difficulty & Length Chips */}
           <div className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-brand-cream/80 border border-white/10 cursor-default capitalize">
              {difficulty.toLowerCase()}
           </div>
           
           <div className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-brand-cream/80 border border-white/10 cursor-default">
              {TEST_MODE_CONFIG[testMode].label} ({TEST_MODE_CONFIG[testMode].targetQuestions})
           </div>
        </div>

        <button 
            onClick={handleStart}
            disabled={loadingQuestions}
            className="w-full bg-brand-orange hover:bg-brand-darkOrange text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-orange/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <GraduationCap className="w-5 h-5" />
            Start Assessment
        </button>

        {/* Error Message */}
        {loadError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {loadError}
          </div>
        )}
       </div>
    </div>
      );
    } catch (error) {
      console.error('[TestSuite] Error in renderConfig:', error);
      return (
        <div className="w-full max-w-md bg-[#3E2723] rounded-2xl shadow-2xl border border-[#A1887F]/30 p-8 text-center">
          <p className="text-red-400 font-bold">Error rendering config</p>
          <p className="text-brand-cream/60 text-sm mt-2">{String(error)}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-brand-orange rounded-lg text-white">Close</button>
        </div>
      );
    }
  };

  const renderLoading = () => (
    <div className="w-full max-w-md bg-[#3E2723] rounded-2xl shadow-2xl border border-[#A1887F]/30 p-8 relative z-10 animate-slide-up my-auto flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-brand-orange animate-spin mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Loading Questions</h3>
      <p className="text-brand-cream/60 text-center text-sm">
        Fetching {currentModeConfig.targetQuestions} questions based on your criteria...
      </p>
    </div>
  );

  const renderQuiz = () => {
    // All Caught Up state (for Quick mode with no due cards)
    if (allCaughtUp) {
      return (
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center h-full animate-fade-in">
          <div className="bg-green-500/20 p-6 rounded-full mb-6">
            <Trophy className="w-16 h-16 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">All Caught Up! 🎉</h3>
          <p className="text-brand-cream/70 text-center mb-6 max-w-sm leading-relaxed">
            You've reviewed all your due cards for today. Great job staying on top of your studies!
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => {
                setTestMode('STANDARD');
                setAllCaughtUp(false);
                loadQuestions();
              }}
              className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-bold hover:bg-white/20 transition-colors"
            >
              Study New Cards
            </button>
            <button 
              onClick={onClose} 
              className="px-6 py-3 bg-brand-orange rounded-xl text-white font-bold hover:bg-brand-darkOrange transition-colors"
            >
              Return to Book
            </button>
          </div>
        </div>
      );
    }

    if (!currentQuestion) {
      return (
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center h-full">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Questions Available</h3>
          <p className="text-brand-cream/60 text-center mb-4">Unable to load questions for this assessment.</p>
          <button onClick={onClose} className="px-6 py-2 bg-brand-orange rounded-lg text-white font-bold">
            Return to Book
          </button>
        </div>
      );
    }

    return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full animate-fade-in">
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 custom-scrollbar">
          
          {/* Progress Section */}
          <div className="mb-6 md:mb-10 w-full max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2 md:mb-3 text-brand-cream/60">
              <span className="font-mono text-xs md:text-sm tracking-widest font-bold">QUESTION {currentQuestionIndex + 1} / {totalQuestions}</span>
              <div className="flex items-center gap-3">
                {/* SRS Stats */}
                {useSrs && (srsDueCount > 0 || srsNewCount > 0) && (
                  <>
                    {srsDueCount > 0 && (
                      <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 rounded text-blue-400 border border-blue-500/20">
                        <RefreshCw className="w-3 h-3" />
                        {srsDueCount} due
                      </span>
                    )}
                    {srsNewCount > 0 && (
                      <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-green-500/10 rounded text-green-400 border border-green-500/20">
                        <Zap className="w-3 h-3" />
                        {srsNewCount} new
                      </span>
                    )}
                  </>
                )}
                {/* Current question SRS status */}
                {useSrs && currentQuestion.srsData && (
                  <span className={`hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                    currentQuestion.srsData.isNew 
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {currentQuestion.srsData.isNew ? 'New' : `Box ${currentQuestion.srsData.box}`}
                  </span>
                )}
                {currentQuestion.tags?.difficulty && (
                  <span className="hidden md:inline-block text-[10px] font-bold px-2 py-0.5 bg-white/5 rounded text-brand-cream/40 border border-white/5 tracking-wider uppercase">
                    {currentQuestion.tags.difficulty}
                  </span>
                )}
                <span className="hidden md:inline-block text-[10px] font-bold px-2 py-0.5 bg-white/5 rounded text-brand-cream/40 border border-white/5 tracking-wider">{currentModeConfig.label}</span>
                <div className="flex items-center gap-1.5 text-xs font-mono bg-black/30 px-2 py-1 rounded">
                  <Timer className="w-3 h-3 text-brand-orange" />
                  <span>{formatTime(elapsedTime)}</span>
                </div>
              </div>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand-orange to-brand-darkOrange transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Main Question Area */}
          <div className="flex flex-col items-center justify-start w-full max-w-3xl mx-auto pb-6">
            <div className="w-full mb-4 md:mb-8">
                {/* Chapter indicator */}
                {currentQuestion.chapterNumber && (
                  <div className="text-xs text-brand-cream/40 mb-2 uppercase tracking-wider">
                    Chapter {currentQuestion.chapterNumber}
                  </div>
                )}
                
                <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-white mb-6 md:mb-8 leading-snug drop-shadow-sm">
                    {currentQuestion.text}
                </h3>

                {/* Hints Section - Show before answer is checked */}
                {!isAnswerChecked && currentHints.length > 0 && (
                  <div className="mb-6 space-y-2">
                    {/* Revealed hints */}
                    {currentHints.slice(0, revealedHintIndex + 1).map((hint, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg animate-fade-in"
                      >
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs text-yellow-400/70 uppercase tracking-wider font-bold">
                              Hint {idx + 1} ({hint.level})
                            </span>
                            <p className="text-sm text-brand-cream/90 mt-1">{hint.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Hint button */}
                    {hasMoreHints && (
                      <button
                        onClick={handleRevealHint}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-colors"
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span>
                          {revealedHintIndex < 0 ? 'Need a hint?' : `Show another hint (${currentHints.length - revealedHintIndex - 1} left)`}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Answer Area */}
                <div className="space-y-3 md:space-y-4 w-full">
                {(currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE') && currentQuestion.options?.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    let buttonClass = "w-full p-4 md:p-6 rounded-2xl border text-left transition-all relative overflow-hidden group flex items-center justify-between ";
                    
                    if (isAnswerChecked) {
                        if (option === currentQuestion.correctAnswer) {
                            buttonClass += "bg-green-500/10 border-green-500/50 text-white shadow-[0_0_15px_rgba(34,197,94,0.1)]";
                        } else if (isSelected) {
                            buttonClass += "bg-red-500/10 border-red-500/50 text-white";
                        } else {
                            buttonClass += "bg-black/20 border-white/5 opacity-40";
                        }
                    } else {
                        if (isSelected) {
                            buttonClass += "bg-brand-orange text-white border-brand-orange shadow-lg transform scale-[1.01]";
                        } else {
                            buttonClass += "bg-black/20 border-white/10 text-brand-cream/80 hover:bg-white/5 hover:border-white/20 hover:text-white";
                        }
                    }

                    return (
                    <button 
                        key={idx}
                        onClick={() => !isAnswerChecked && setSelectedOption(option)}
                        disabled={isAnswerChecked}
                        className={buttonClass}
                    >
                        <span className="font-medium text-base md:text-lg leading-snug">{option}</span>
                        {isAnswerChecked && option === currentQuestion.correctAnswer && (
                            <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400 shrink-0 ml-4" />
                        )}
                        {isAnswerChecked && isSelected && option !== currentQuestion.correctAnswer && (
                            <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-400 shrink-0 ml-4" />
                        )}
                    </button>
                    );
                })}

                {(currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'FILL_BLANK') && (
                    <div className="relative">
                    <textarea
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        disabled={isAnswerChecked}
                        placeholder="Type your answer here..."
                        className={`w-full bg-black/20 border rounded-2xl p-4 md:p-6 text-white text-lg md:text-xl focus:outline-none focus:ring-2 min-h-[140px] md:min-h-[160px] transition-colors resize-none ${
                        isAnswerChecked 
                        ? textAnswer.toLowerCase().includes(currentQuestion.correctAnswer.toLowerCase()) 
                            ? 'border-green-500/50 focus:ring-green-500/50' 
                            : 'border-red-500/50 focus:ring-red-500/50'
                        : 'border-white/10 focus:border-brand-orange/50 focus:ring-brand-orange/20'
                        }`}
                    />
                    </div>
                )}
                </div>
            </div>

            {/* Feedback Section */}
            {isAnswerChecked && answers.length > 0 && (
              <div className={`w-full p-4 md:p-6 rounded-2xl animate-slide-up border backdrop-blur-sm ${
                answers[answers.length - 1].correct 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-start gap-3 md:gap-4">
                  {answers[answers.length - 1].correct ? (
                    <div className="bg-green-500/20 p-2 md:p-2.5 rounded-xl shrink-0">
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                    </div>
                  ) : (
                    <div className="bg-red-500/20 p-2 md:p-2.5 rounded-xl shrink-0">
                        <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className={`font-bold text-base md:text-lg mb-1 md:mb-2 ${answers[answers.length - 1].correct ? 'text-green-400' : 'text-red-400'}`}>
                      {answers[answers.length - 1].correct ? 'Correct!' : 'Not quite right.'}
                    </h4>
                    
                    {/* AI Feedback for essay questions */}
                    {currentFeedback && (currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'BRIEF_RESPONSE') && (
                      <p className="text-brand-cream/90 leading-relaxed text-sm md:text-base mb-3 p-3 bg-black/20 rounded-lg border border-white/5">
                        <span className="text-xs text-brand-orange uppercase tracking-wider font-bold block mb-1">AI Feedback</span>
                        {currentFeedback}
                      </p>
                    )}
                    
                    {/* Explanation */}
                    <p className="text-brand-cream/90 leading-relaxed text-sm md:text-base">
                      <span className="text-xs text-brand-cream/50 uppercase tracking-wider font-bold block mb-1">Explanation</span>
                      {currentQuestion.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>

      {/* Sticky Footer Actions */}
      <div className="p-4 md:p-6 border-t border-white/5 bg-[#1a110e] w-full z-30 shrink-0 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
        <div className="max-w-3xl mx-auto">
            {!isAnswerChecked ? (
              <div className="flex justify-end">
                <button 
                    onClick={handleCheckAnswer}
                    disabled={(!selectedOption && !textAnswer) || isEvaluating}
                    className="w-full md:w-auto px-6 md:px-10 py-3 md:py-4 bg-white text-[#3E2723] font-bold text-base md:text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-brand-cream transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:-translate-y-0.5"
                >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      'Check Answer'
                    )}
                </button>
              </div>
            ) : useSrs ? (
              // SRS Rating Buttons
              <div className="space-y-3">
                <p className="text-center text-xs text-brand-cream/50 uppercase tracking-wider font-bold">
                  How well did you know this?
                </p>
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  {(['Again', 'Hard', 'Good', 'Easy'] as SrsRating[]).map((rating) => {
                    const config = RATING_CONFIG[rating];
                    const Icon = rating === 'Again' ? RotateCcw 
                      : rating === 'Hard' ? ThumbsDown 
                      : rating === 'Good' ? ThumbsUp 
                      : Zap;
                    
                    return (
                      <button
                        key={rating}
                        onClick={() => handleRatingSelect(rating)}
                        disabled={isSubmittingRating}
                        className={`flex flex-col items-center gap-1 p-3 md:p-4 rounded-xl border transition-all hover:scale-[1.02] disabled:opacity-50 ${
                          selectedRating === rating 
                            ? `${config.bgColor} border-current` 
                            : 'bg-black/20 border-white/10 hover:bg-white/5'
                        }`}
                        style={{ color: config.color }}
                      >
                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                        <span className="font-bold text-sm">{config.label}</span>
                        <span className="text-[10px] opacity-70">{config.description}</span>
                      </button>
                    );
                  })}
                </div>
                {isSubmittingRating && (
                  <div className="flex items-center justify-center gap-2 text-brand-cream/60 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving progress...
                  </div>
                )}
              </div>
            ) : (
              // Legacy non-SRS mode - just Next button
              <div className="flex justify-end">
                <button 
                    onClick={handleNext}
                    className="w-full md:w-auto px-6 md:px-10 py-3 md:py-4 bg-brand-orange text-white font-bold text-base md:text-lg rounded-xl shadow-[0_0_20px_rgba(243,120,53,0.3)] hover:bg-brand-darkOrange transition-all flex items-center justify-center gap-3 hover:-translate-y-0.5"
                >
                    {currentQuestionIndex + 1 >= totalQuestions ? 'View Results' : 'Next Question'}
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
  };

  const renderResults = () => {
    const percentage = Math.round((score / totalQuestions) * 100);
    let grade = 'Needs Work';
    let color = 'text-red-400';
    let colorClass = 'text-red-400';
    let strokeColor = '#F87171'; // red-400

    if (percentage >= 90) { 
        grade = 'Excellent'; 
        color = 'text-green-400';
        colorClass = 'text-green-400';
        strokeColor = '#4ADE80'; 
    }
    else if (percentage >= 70) { 
        grade = 'Good'; 
        color = 'text-yellow-400';
        colorClass = 'text-yellow-400';
        strokeColor = '#FACC15'; 
    }
    else if (percentage >= 50) { 
        grade = 'Fair'; 
        color = 'text-orange-400'; 
        colorClass = 'text-orange-400';
        strokeColor = '#FB923C';
    }

    return (
      <div className="w-full max-w-5xl mx-auto h-full flex flex-col animate-fade-in px-4 md:px-6 py-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 h-full">
            
            {/* Left Col: Summary */}
            <div className="col-span-1 bg-black/20 rounded-3xl p-6 md:p-8 border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px]">
                 {/* Background Glow */}
                 <div className={`absolute top-0 left-0 w-full h-full opacity-10 bg-gradient-to-br from-transparent via-${color.split('-')[1]}-500 to-transparent`}></div>
                 
                 <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-full bg-black/40 border-8 border-white/5 mb-4 md:mb-6 relative">
                        <Trophy className={`w-10 h-10 md:w-12 md:h-12 ${colorClass}`} />
                        <svg className="absolute inset-0 w-full h-full -rotate-90 scale-110" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/5" />
                            <circle cx="50" cy="50" r="46" fill="none" stroke={strokeColor} strokeWidth="6" strokeDasharray="289" strokeDashoffset={289 - (289 * percentage) / 100} strokeLinecap="round" />
                        </svg>
                    </div>
                    <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-2 tracking-tight">{score} <span className="text-2xl md:text-3xl text-white/40 font-medium">/ {length}</span></h2>
                    <p className={`text-xl md:text-2xl font-bold ${colorClass} uppercase tracking-wide`}>{grade}</p>
                    <p className="text-brand-cream/60 mt-4 text-xs md:text-sm font-medium">Test completed on {new Date().toLocaleDateString()}</p>
                 </div>
            </div>

            {/* Right Col: Details */}
            <div className="col-span-1 md:col-span-2 flex flex-col">
                 {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/20 rounded-2xl p-4 md:p-5 border border-white/5 flex items-center gap-3 md:gap-4">
                        <div className="bg-blue-500/20 p-2 md:p-3 rounded-xl">
                            <Target className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-brand-cream/60 text-[10px] md:text-xs font-bold uppercase tracking-wider">Accuracy</div>
                            <div className="text-xl md:text-2xl font-bold text-white">{percentage}%</div>
                        </div>
                    </div>
                    <div className="bg-black/20 rounded-2xl p-4 md:p-5 border border-white/5 flex items-center gap-3 md:gap-4">
                        <div className="bg-purple-500/20 p-2 md:p-3 rounded-xl">
                            <Timer className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-brand-cream/60 text-[10px] md:text-xs font-bold uppercase tracking-wider">Time Taken</div>
                            <div className="text-xl md:text-2xl font-bold text-white">4m 12s</div>
                        </div>
                    </div>
                </div>

                {/* Feedback Areas */}
                <div className="flex-1 space-y-4 mb-6">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 md:p-6">
                        <h4 className="font-bold text-green-400 mb-3 text-sm uppercase tracking-wide">Key Strengths</h4>
                        <ul className="grid grid-cols-1 gap-2">
                            <li className="flex items-start gap-2 text-sm text-brand-cream/90">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                Identification of key symbols and themes
                            </li>
                            <li className="flex items-start gap-2 text-sm text-brand-cream/90">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                Character motivation analysis
                            </li>
                        </ul>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 md:p-6">
                        <h4 className="font-bold text-red-400 mb-3 text-sm uppercase tracking-wide">Focus Areas</h4>
                        <ul className="grid grid-cols-1 gap-2">
                            <li className="flex items-start gap-2 text-sm text-brand-cream/90">
                                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                Distinguishing between minor antagonists
                            </li>
                            <li className="flex items-start gap-2 text-sm text-brand-cream/90">
                                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                Timeline of events in Chapter 4
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="bg-brand-orange/5 border border-brand-orange/10 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                     <div>
                        <h4 className="font-bold text-brand-orange mb-1 text-sm uppercase flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> Recommended Review
                        </h4>
                        <p className="text-sm text-brand-cream/60">Re-read these sections to improve:</p>
                     </div>
                     <div className="flex gap-2">
                        <span className="bg-brand-orange/20 text-brand-orange px-4 py-2 rounded-lg text-sm font-bold border border-brand-orange/30">Chapter 4</span>
                        <span className="bg-brand-orange/20 text-brand-orange px-4 py-2 rounded-lg text-sm font-bold border border-brand-orange/30">Chapter 7</span>
                     </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-white/10 flex flex-col-reverse md:flex-row gap-4 justify-end">
            <button 
                onClick={handleStart}
                className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5"
            >
                <RefreshCw className="w-5 h-5" />
                Retry Test
            </button>
            <button 
                onClick={onClose}
                className="bg-brand-orange hover:bg-brand-darkOrange text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
            >
                Return to Book
            </button>
        </div>
      </div>
    );
  }

  if (!book) {
    console.error('[TestSuite] Book prop is null/undefined');
    return (
      <div className="fixed inset-0 z-50 bg-[#1a110e] flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-lg font-bold text-red-400">Error: No book data provided</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-brand-orange rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  if (!book.chapters || !Array.isArray(book.chapters)) {
    console.error('[TestSuite] Book chapters missing or invalid:', book.chapters);
    return (
      <div className="fixed inset-0 z-50 bg-[#1a110e] flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-lg font-bold text-red-400">Error: Book chapters data is missing</p>
          <p className="text-sm text-brand-cream/60 mt-2">Book ID: {book.id || 'N/A'}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-brand-orange rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1a110e] flex flex-col animate-fade-in">
       
       {/* Global Background Elements */}
       <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none"></div>
       <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-brown/10 rounded-full blur-[100px] pointer-events-none"></div>

       {step === 'CONFIG' ? (
           <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-md relative z-10 overflow-y-auto">
              {renderConfig()}
           </div>
       ) : step === 'LOADING' ? (
           <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-md relative z-10">
              {renderLoading()}
           </div>
       ) : (
           <>
              {/* Full Screen Header */}
              <div className="bg-[#2a1d18]/80 backdrop-blur-md border-b border-[#A1887F]/20 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-20 relative shrink-0">
                 <button 
                    onClick={onClose} 
                    className="flex items-center text-brand-cream/60 hover:text-white transition-colors group px-2 py-1 rounded-lg hover:bg-white/5"
                 >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                 </button>
                 
                 <div className="text-center">
                     <h2 className="text-white font-bold text-base md:text-lg leading-none truncate max-w-[200px]">{book.title}</h2>
                     <p className="text-[10px] md:text-xs text-brand-cream/40 mt-1 uppercase tracking-widest font-bold">Knowledge Check</p>
                 </div>

                 <div className="w-[60px] md:w-[100px] flex justify-center items-center">
                     {step === 'QUIZ' && (
                         <button 
                            onClick={() => setIsAiAssistOpen(true)}
                            className="flex items-center justify-center p-2 rounded-full bg-white/5 hover:bg-brand-orange/20 text-brand-cream/40 hover:text-brand-orange transition-colors border border-white/5 hover:border-brand-orange/30 group relative"
                            title="Get Help"
                         >
                             <HelpCircle className="w-5 h-5" />
                             <span className="absolute top-full mt-2 right-0 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Ask AI
                             </span>
                         </button>
                     )}
                 </div> 
              </div>

              {/* Main Content Container - Flex-1, no scroll here, handled inside renderQuiz */}
              <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
                  {step === 'QUIZ' && renderQuiz()}
                  {step === 'RESULTS' && renderResults()}
              </div>

              {/* AI Assist Sidebar (Right) - Only during QUIZ */}
              {step === 'QUIZ' && currentQuestion && (
                <HintSidebar
                  isOpen={isAiAssistOpen}
                  onClose={() => setIsAiAssistOpen(false)}
                  book={book}
                  currentQuestion={currentQuestion as Question}
                />
              )}
           </>
       )}
    </div>
  );
};