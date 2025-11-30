import React, { useEffect, useState, useCallback } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error';
  duration?: number; // milliseconds, default 8000
  onDismiss: (id: string) => void;
  undoAction?: () => void;
  undoLabel?: string;
}

const ToastItem: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration = 8000,
  onDismiss,
  undoAction,
  undoLabel = '↩ Undo',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Handle dismissal with animation
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(id);
    }, 300); // Match exit animation duration
  }, [id, onDismiss]);

  // Handle undo click
  const handleUndo = useCallback(() => {
    if (undoAction) {
      undoAction();
    }
    handleDismiss();
  }, [undoAction, handleDismiss]);

  // Animate in on mount
  useEffect(() => {
    // Small delay for mount animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(showTimer);
  }, []);

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl min-w-[320px] max-w-[420px]
        transition-all duration-300 ease-out
        ${isVisible && !isExiting 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-4 opacity-0'
        }
      `}
      style={{
        background: 'rgba(30, 30, 30, 0.95)',
        border: '1px solid #444',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Icon */}
      {type === 'success' ? (
        <div className="shrink-0 w-5 h-5 rounded-full bg-brand-orange/20 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-brand-orange" strokeWidth={3} />
        </div>
      ) : (
        <div className="shrink-0">
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>
      )}

      {/* Message */}
      <span 
        className="flex-1 text-white text-[15px] font-medium leading-snug"
      >
        {message}
      </span>

      {/* Undo Button (only for success with undo action) */}
      {type === 'success' && undoAction && (
        <button
          onClick={handleUndo}
          className="shrink-0 text-brand-orange text-[15px] font-medium hover:underline transition-all"
        >
          {undoLabel}
        </button>
      )}

      {/* Close Button (for errors or when no undo) */}
      {(type === 'error' || !undoAction) && (
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-white/50 hover:text-white transition-colors rounded"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Toast Container Component - manages multiple toasts
export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error';
  duration?: number;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onDismiss={onDismiss}
          undoAction={toast.undoAction}
          undoLabel={toast.undoLabel}
        />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((
    message: string, 
    options?: { undoAction?: () => void; undoLabel?: string; duration?: number }
  ) => {
    return addToast({
      message,
      type: 'success',
      duration: options?.duration ?? 8000,
      undoAction: options?.undoAction,
      undoLabel: options?.undoLabel,
    });
  }, [addToast]);

  const showError = useCallback((message: string, duration?: number) => {
    return addToast({
      message,
      type: 'error',
      duration: duration ?? 5000,
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    ToastContainer: () => <ToastContainer toasts={toasts} onDismiss={removeToast} />,
  };
};

export default ToastItem;
