import React from 'react';
import { EyeOff, Info, X } from 'lucide-react';

interface HideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle: string;
}

const HideModal: React.FC<HideModalProps> = ({ isOpen, onClose, onConfirm, bookTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 text-blue-400">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Info size={24} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">Hide Book from Library</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-zinc-300 text-sm leading-relaxed">
            You are about to hide <span className="text-white font-medium">"{bookTitle}"</span> from the public library view.
          </p>
          <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg">
            <p className="text-zinc-500 text-xs">
              <span className="text-zinc-400 font-medium">Note:</span> The file will not be deleted from the server. It will still appear in your upload history and can be restored later.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-100 text-black rounded-md hover:bg-zinc-300 transition-all shadow-lg shadow-zinc-900/20"
          >
            <EyeOff size={16} />
            Hide Book
          </button>
        </div>
      </div>
    </div>
  );
};

export default HideModal;
