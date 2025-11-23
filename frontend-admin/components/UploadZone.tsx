import React, { useCallback, useState } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  isUploading: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, selectedFile, onClearFile, isUploading }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  }, [isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/epub+zip') {
      onFileSelect(files[0]);
    }
  }, [onFileSelect, isUploading]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  if (selectedFile) {
    return (
      <div className="mt-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-between group">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded bg-zinc-800/50 text-zinc-400">
            <FileIcon size={24} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-zinc-200 truncate">{selectedFile.name}</span>
            <span className="text-xs text-zinc-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        </div>
        {!isUploading && (
          <button
            onClick={onClearFile}
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`mt-4 relative flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer
        ${isDragging 
          ? 'border-blue-500 bg-blue-500/5' 
          : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30 bg-zinc-950'
        }
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        accept="application/epub+zip"
        onChange={handleFileInput}
        disabled={isUploading}
      />
      <div className="flex flex-col items-center gap-2 text-zinc-400">
        <div className={`p-3 rounded-full bg-zinc-900 border border-zinc-800 ${isDragging ? 'text-blue-500 border-blue-500/30' : ''}`}>
          <UploadCloud size={24} />
        </div>
        <p className="text-sm font-medium text-zinc-300">
          Drop your EPUB here, or <span className="text-blue-400">browse</span>
        </p>
        <p className="text-xs text-zinc-500">Maximum file size 50MB</p>
      </div>
    </div>
  );
};

export default UploadZone;
