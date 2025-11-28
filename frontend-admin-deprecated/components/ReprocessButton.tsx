import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { reprocessBook, getBookStatus } from '../services/api';
import ReprocessModal from './ReprocessModal';

interface ReprocessButtonProps {
  bookId: string;
  bookTitle: string;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const ReprocessButton: React.FC<ReprocessButtonProps> = ({ bookId, bookTitle, onToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'reprocessing' | 'success' | 'error'>('idle');
  const [modalLoading, setModalLoading] = useState(false);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  const handleConfirm = async () => {
    setModalLoading(true);
    try {
      await reprocessBook(bookId);
      setStatus('reprocessing');
      setIsModalOpen(false);
      onToast('info', `Reprocessing started for "${bookTitle}"`);
      startPolling();
    } catch (error: any) {
      onToast('error', `Failed to start reprocessing: ${error.message}`);
    } finally {
      setModalLoading(false);
    }
  };

  const startPolling = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    
    pollInterval.current = setInterval(async () => {
      try {
        const data = await getBookStatus(bookId);
        const currentStatus = data.status;
        
        if (currentStatus === 'success') {
          setStatus('success');
          onToast('success', `Reprocessing complete for "${bookTitle}"`);
          stopPolling();
        } else if (currentStatus === 'failed' || currentStatus === 'error') {
          setStatus('error');
          onToast('error', `Reprocessing failed for "${bookTitle}"`);
          stopPolling();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    // Re-enable button after completion
    setTimeout(() => {
      setStatus('idle');
    }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={status === 'reprocessing'}
        className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${
          status === 'reprocessing' 
            ? 'text-amber-500 bg-amber-500/10 cursor-not-allowed' 
            : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800'
        }`}
        title="Reprocess Book"
      >
        <RefreshCw size={16} className={status === 'reprocessing' ? 'animate-spin' : ''} />
      </button>

      <ReprocessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        bookTitle={bookTitle}
        isProcessing={modalLoading}
      />
    </>
  );
};

export default ReprocessButton;
