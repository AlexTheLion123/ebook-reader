import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle: string;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, bookTitle }) => {
  const [confirmText, setConfirmText] = useState('');
  const expectedText = 'DELETE';
  const isConfirmValid = confirmText === expectedText;

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm();
      setConfirmText(''); // Reset for next time
    }
  };

  const handleClose = () => {
    setConfirmText(''); // Reset on close
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 text-red-400">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">Delete Book Permanently</h3>
          </div>
          <button onClick={handleClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-zinc-300 text-sm leading-relaxed">
            You are about to permanently delete <span className="text-white font-medium">"{bookTitle}"</span> from the library.
          </p>
          <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
            <p className="text-red-400 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Warning: This action cannot be undone!
              </span>
            </p>
            <p className="text-zinc-400 text-xs">
              The file will be permanently removed from the server and will no longer be accessible to users on the frontend.
            </p>
          </div>
          
          <div className="space-y-2 pt-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Type <span className="text-white font-bold px-1.5 py-0.5 bg-zinc-800 rounded font-mono">{expectedText}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedText}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder:text-zinc-700 font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500"
          >
            <Trash2 size={16} />
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
