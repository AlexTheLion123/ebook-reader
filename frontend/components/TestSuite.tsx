import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Trophy, ArrowRight, BrainCircuit, BookOpen, BarChart2, Timer, GraduationCap, Target, RefreshCw, ArrowLeft, HelpCircle } from 'lucide-react';
import { BookDetails, Question, QuestionType } from '../types';
import { HintSidebar } from './HintSidebar';

interface TestSuiteProps {
  book: BookDetails;
  onClose: () => void;
}

type TestStep = 'CONFIG' | 'QUIZ' | 'RESULTS';

// Mock Data Pool
const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'MCQ',
    text: "What is the primary motivation driving the protagonist's actions in the first half of the book?",
    options: [
      "A desire for revenge against a former lover",
      "The pursuit of forbidden knowledge",
      "The need to escape a totalitarian regime",
      "Financial desperation"
    ],
    correctAnswer: "The need to escape a totalitarian regime",
    explanation: "Throughout the early chapters, the protagonist's internal monologue focuses heavily on the oppressive nature of the state and the desire for individual freedom."
  },
  {
    id: 2,
    type: 'TRUE_FALSE',
    text: "True or False: The central conflict is resolved peacefully through diplomatic dialogue.",
    options: ["True", "False"],
    correctAnswer: "False",
    explanation: "The climax involves a violent confrontation that fundamentally changes the power dynamic, proving that diplomacy had failed."
  },
  {
    id: 3,
    type: 'MCQ',
    text: "Which symbol represents the loss of innocence in the narrative?",
    options: ["The White Bird", "The Broken Clock", "The Dusty Mirror", "The Golden Coin"],
    correctAnswer: "The Broken Clock",
    explanation: "The broken clock appears specifically in scenes where characters confront their childhood memories, symbolizing the freezing of time and loss of innocence."
  },
  {
    id: 4,
    type: 'FILL_BLANK',
    text: "The antagonist's philosophy is best described as ______ utilitarianism.",
    correctAnswer: "ruthless",
    explanation: "Critics often describe the antagonist's approach as 'ruthless utilitarianism' because they justify any means for the 'greater good'."
  },
  {
    id: 5,
    type: 'MCQ',
    text: "How does the setting contribute to the overall mood of the story?",
    options: [
      "It provides a cheerful contrast to the dark themes",
      "The constant rain and grey skies mirror the internal depression of the characters",
      "It is irrelevant to the plot",
      "It represents a technological utopia"
    ],
    correctAnswer: "The constant rain and grey skies mirror the internal depression of the characters",
    explanation: "Pathetic fallacy is used extensively; the weather almost always reflects the protagonist's emotional state."
  }
];

export const TestSuite: React.FC<TestSuiteProps> = ({ book, onClose }) => {
  const [step, setStep] = useState<TestStep>('CONFIG');
  
  // Config State
  const [scope, setScope] = useState<'FULL' | 'CHAPTER'>('FULL');
  const [difficulty, setDifficulty] = useState<'BASIC' | 'MEDIUM' | 'DEEP'>('MEDIUM');
  const [length, setLength] = useState<5 | 15 | 30>(5);

  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{questionId: number, correct: boolean}[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds

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

  // Derived State
  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex % MOCK_QUESTIONS.length];
  const progress = ((currentQuestionIndex) / length) * 100;

  const handleStart = () => {
    setStep('QUIZ');
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnswers([]);
    setIsAnswerChecked(false);
    setSelectedOption(null);
    setTextAnswer('');
    setElapsedTime(0);
  };

  const handleCheckAnswer = () => {
    let isCorrect = false;
    
    if (currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE') {
      isCorrect = selectedOption === currentQuestion.correctAnswer;
    } else {
      // Mock validation for text inputs
      isCorrect = textAnswer.toLowerCase().includes(currentQuestion.correctAnswer.toLowerCase().split(' ')[0]);
    }

    if (isCorrect) setScore(prev => prev + 1);
    
    setAnswers(prev => [...prev, { questionId: currentQuestion.id, correct: isCorrect }]);
    setIsAnswerChecked(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex + 1 >= length) {
      setStep('RESULTS');
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsAnswerChecked(false);
      setSelectedOption(null);
      setTextAnswer('');
    }
  };

  // Scroll config area if needed
  const renderConfig = () => (
    <div className="w-full max-w-2xl bg-[#3E2723] rounded-2xl shadow-2xl border border-[#A1887F]/30 overflow-hidden relative z-10 animate-slide-up my-auto">
       <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#2a1d18]/50">
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
       
       <div className="p-8 space-y-5">
        <div className="text-center space-y-1 mb-2">
            <h2 className="text-2xl font-bold text-white">Configure Assessment</h2>
            <p className="text-brand-cream/60">Customize the evaluation to match your learning goals.</p>
        </div>

        {/* Scope */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Scope
            </label>
            <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setScope('FULL')}
                className={`p-4 rounded-xl border transition-all text-left group ${scope === 'FULL' ? 'bg-brand-orange/20 border-brand-orange text-white' : 'bg-black/20 border-white/5 text-brand-cream/60 hover:bg-white/5'}`}
            >
                <div className="font-bold text-base leading-tight">Full Book</div>
                <div className="text-xs opacity-70 mt-1">Comprehensive review.</div>
            </button>
            <button 
                onClick={() => setScope('CHAPTER')}
                className={`p-4 rounded-xl border transition-all text-left group ${scope === 'CHAPTER' ? 'bg-brand-orange/20 border-brand-orange text-white' : 'bg-black/20 border-white/5 text-brand-cream/60 hover:bg-white/5'}`}
            >
                <div className="font-bold text-base leading-tight">Chapter Select</div>
                <div className="text-xs opacity-70 mt-1">Specific sections.</div>
            </button>
            </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase tracking-wider flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" /> Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
            {(['BASIC', 'MEDIUM', 'DEEP'] as const).map((level) => (
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

        {/* Length */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase tracking-wider flex items-center gap-2">
            <Timer className="w-4 h-4" /> Length
            </label>
            <div className="grid grid-cols-3 gap-3">
            {([5, 15, 30] as const).map((count) => (
                <button 
                key={count}
                onClick={() => setLength(count)}
                className={`p-3 rounded-xl border transition-all text-center ${length === count ? 'bg-brand-orange/20 border-brand-orange text-white' : 'bg-black/20 border-white/5 text-brand-cream/60 hover:bg-white/5'}`}
                >
                <div className="font-bold text-sm">{count} Qs</div>
                </button>
            ))}
            </div>
        </div>

        <button 
            onClick={handleStart}
            className="w-full bg-brand-orange hover:bg-brand-darkOrange text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-orange/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
        >
            <GraduationCap className="w-5 h-5" />
            Start Assessment
        </button>
       </div>
    </div>
  );

  const renderQuiz = () => (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full animate-fade-in">
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 custom-scrollbar">
          
          {/* Progress Section */}
          <div className="mb-6 md:mb-10 w-full max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2 md:mb-3 text-brand-cream/60">
              <span className="font-mono text-xs md:text-sm tracking-widest font-bold">QUESTION {currentQuestionIndex + 1} / {length}</span>
              <div className="flex items-center gap-3">
                <span className="hidden md:inline-block text-[10px] font-bold px-2 py-0.5 bg-white/5 rounded text-brand-cream/40 border border-white/5 tracking-wider">{difficulty}</span>
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
                <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-white mb-6 md:mb-8 leading-snug drop-shadow-sm">
                    {currentQuestion.text}
                </h3>

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
            {isAnswerChecked && (
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
                  <div>
                    <h4 className={`font-bold text-base md:text-lg mb-1 md:mb-2 ${answers[answers.length - 1].correct ? 'text-green-400' : 'text-red-400'}`}>
                      {answers[answers.length - 1].correct ? 'Correct!' : 'Not quite right.'}
                    </h4>
                    <p className="text-brand-cream/90 leading-relaxed text-sm md:text-base">
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
        <div className="max-w-3xl mx-auto flex justify-end">
            {!isAnswerChecked ? (
            <button 
                onClick={handleCheckAnswer}
                disabled={(!selectedOption && !textAnswer)}
                className="w-full md:w-auto px-6 md:px-10 py-3 md:py-4 bg-white text-[#3E2723] font-bold text-base md:text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-brand-cream transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:-translate-y-0.5"
            >
                Check Answer
            </button>
            ) : (
            <button 
                onClick={handleNext}
                className="w-full md:w-auto px-6 md:px-10 py-3 md:py-4 bg-brand-orange text-white font-bold text-base md:text-lg rounded-xl shadow-[0_0_20px_rgba(243,120,53,0.3)] hover:bg-brand-darkOrange transition-all flex items-center justify-center gap-3 hover:-translate-y-0.5"
            >
                {currentQuestionIndex + 1 >= length ? 'View Results' : 'Next Question'}
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            )}
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    const percentage = Math.round((score / length) * 100);
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

  return (
    <div className="fixed inset-0 z-50 bg-[#1a110e] flex flex-col animate-fade-in">
       
       {/* Global Background Elements */}
       <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none"></div>
       <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-brown/10 rounded-full blur-[100px] pointer-events-none"></div>

       {step === 'CONFIG' ? (
           <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-md relative z-10 overflow-y-auto">
              {renderConfig()}
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
           </>
       )}

      {/* AI Assist Sidebar (Right) */}
      <HintSidebar
        isOpen={isAiAssistOpen}
        onClose={() => setIsAiAssistOpen(false)}
        book={book}
        currentQuestion={currentQuestion}
      />
    </div>
  );
};