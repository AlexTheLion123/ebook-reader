import React from 'react';
import { X, LogIn } from 'lucide-react';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({ isOpen, onClose, onSignIn }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#3E2723]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#A1887F]/30 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-brand-orange/20 p-2 rounded-lg">
              <LogIn className="w-5 h-5 text-brand-orange" />
            </div>
            <h3 className="text-lg font-bold text-white">Sign In Required</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-brand-cream/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 text-center">
          <p className="text-brand-cream/80 mb-6">
            Please sign in to test yourself and track your progress. Your learning data will be saved to your account.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={onSignIn}
              className="w-full bg-brand-orange hover:bg-brand-darkOrange text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-brand-orange/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white/5 hover:bg-white/10 text-brand-cream/80 font-medium py-3 px-6 rounded-xl border border-white/10 transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
