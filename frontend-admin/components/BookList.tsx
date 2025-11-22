import React from 'react';
import { Book, UploadStatus } from '../types';
import { FileText, Check, Loader2, AlertCircle, Clock } from 'lucide-react';

interface BookListProps {
  books: Book[];
}

const StatusBadge: React.FC<{ status: UploadStatus }> = ({ status }) => {
  switch (status) {
    case 'success':
      return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-950/30 text-green-400 border border-green-900/30"><Check size={12} /> Uploaded</span>;
    case 'uploading':
      return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-950/30 text-blue-400 border border-blue-900/30"><Loader2 size={12} className="animate-spin" /> Uploading</span>;
    case 'error':
      return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-950/30 text-red-400 border border-red-900/30"><AlertCircle size={12} /> Failed</span>;
    default:
      return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700"><Clock size={12} /> Queued</span>;
  }
};

const BookList: React.FC<BookListProps> = ({ books }) => {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
        <FileText size={32} className="mb-3 opacity-20" />
        <p className="text-sm">No books uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900/50 text-zinc-400 font-medium border-b border-zinc-800">
          <tr>
            <th className="px-4 py-3 w-[40%]">Book Details</th>
            <th className="px-4 py-3 w-[20%]">ID</th>
            <th className="px-4 py-3 w-[20%]">Date</th>
            <th className="px-4 py-3 w-[20%] text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {books.map((book) => (
            <tr key={book.bookId} className="hover:bg-zinc-900/40 transition-colors">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-medium truncate">{book.title}</span>
                  <span className="text-xs text-zinc-500 truncate">{book.author || 'Unknown Author'} • {book.subject || 'General'}</span>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-500 select-all">
                {book.bookId.slice(0, 8)}...
              </td>
              <td className="px-4 py-3 text-zinc-500 text-xs">
                {new Date(book.uploadedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <StatusBadge status={book.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BookList;
