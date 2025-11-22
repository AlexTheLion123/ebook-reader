import React from 'react';
import { FrontendBook } from '../types';
import { Library, EyeOff } from 'lucide-react';

interface LibraryListProps {
  books: FrontendBook[];
  onHide: (book: FrontendBook) => void;
}

const LibraryList: React.FC<LibraryListProps> = ({ books, onHide }) => {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
        <Library size={24} className="mb-2 opacity-20" />
        <p className="text-sm">No books currently visible in the library.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900/50 text-zinc-400 font-medium border-b border-zinc-800">
          <tr>
            <th className="px-4 py-3 w-[40%]">Book Details</th>
            <th className="px-4 py-3 w-[25%]">ID</th>
            <th className="px-4 py-3 w-[25%]">Description</th>
            <th className="px-4 py-3 w-[10%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {books.map((book) => {
            if (!book) return null;
            return (
              <tr 
                key={book.bookId || Math.random()} 
                className="group transition-colors hover:bg-zinc-900/40"
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-zinc-200 font-medium truncate max-w-[200px] sm:max-w-[300px]">
                      {book.title || 'Untitled'}
                    </span>
                    <span className="text-xs text-zinc-500 truncate max-w-[200px] sm:max-w-[300px]">
                      {book.author || 'Unknown Author'} {book.subject ? `• ${book.subject}` : ''}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500 select-all">
                  {book.bookId ? `${book.bookId.slice(0, 8)}...` : 'No ID'}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  <span className="line-clamp-2 max-w-[200px]">{book.description || 'No description'}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onHide(book)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Hide from library"
                  >
                    <EyeOff size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LibraryList;
