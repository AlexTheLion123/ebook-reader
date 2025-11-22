import React from 'react';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';

interface ReprocessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle: string;
  isProcessing?: boolean;
}

const ReprocessModal: React.FC<ReprocessModalProps> = ({ isOpen, onClose, onConfirm, bookTitle, isProcessing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 text-left">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 text-amber-400">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <RefreshCw size={24} className={isProcessing ? "animate-spin" : ""} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">Confirm Reprocessing</h3>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-zinc-300 text-sm leading-relaxed">
            You are about to reprocess <span className="text-white font-medium">"{bookTitle}"</span>.
          </p>
          <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg flex gap-3">
            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
            <p className="text-amber-200/80 text-xs leading-relaxed">
              Reprocessing will cost <strong>~$4.50</strong>. This will re-extract all text from the PDF using AWS Textract. Continue?
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-lg shadow-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Starting...
              </>
            ) : (
              'Confirm Reprocess'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReprocessModal;
