import React, { useState, useEffect, useCallback } from 'react';
import { Book, ToastMessage, UploadStatus } from './types';
import { getPresignedUrl, uploadFileToS3 } from './services/api';
import UploadZone from './components/UploadZone';
import BookList from './components/BookList';
import Toast from './components/Toast';
import { Book as BookIcon, RefreshCw, Plus, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [uploadedBooks, setUploadedBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('uploadedBooks');
    return saved ? JSON.parse(saved) : [];
  });

  const [form, setForm] = useState({
    bookId: crypto.randomUUID(),
    title: '',
    author: '',
    description: '',
    subject: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('uploadedBooks', JSON.stringify(uploadedBooks));
  }, [uploadedBooks]);

  // --- Handlers ---
  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const refreshId = () => {
    setForm(prev => ({ ...prev, bookId: crypto.randomUUID() }));
  };

  const resetForm = () => {
    setForm({
      bookId: crypto.randomUUID(),
      title: '',
      author: '',
      description: '',
      subject: ''
    });
    setSelectedFile(null);
    setUploadStatus('idle');
    setProgress(0);
  };

  const handleUpload = async () => {
    console.log('[App] handleUpload called');
    if (!selectedFile || !form.title || !form.author || !form.description || !form.subject) {
      console.warn('[App] Missing required fields', { selectedFile, form });
      addToast('error', 'Please fill in all required fields (Title, Author, Subject, Description, File).');
      return;
    }

    if (form.description.length < 20 || form.description.length > 200) {
      addToast('error', 'Description must be between 20 and 200 characters.');
      return;
    }

    console.log('[App] Starting upload process', { form, fileName: selectedFile.name });
    setUploadStatus('uploading');
    setProgress(0);

    // Optimistic addition to list
    const newBook: Book = {
      ...form,
      fileName: selectedFile.name,
      uploadedAt: new Date().toISOString(),
      status: 'uploading'
    };

    setUploadedBooks(prev => [newBook, ...prev]);

    try {
      // 1. Get Presigned URL
      addToast('info', 'Initializing upload...');
      console.log('[App] Calling getPresignedUrl...');
      const uploadUrl = await getPresignedUrl(form.bookId, selectedFile.name, {
        title: form.title,
        author: form.author,
        description: form.description,
        subject: form.subject
      });
      console.log('[App] Received uploadUrl');

      // 2. Upload File
      console.log('[App] Calling uploadFileToS3...');
      await uploadFileToS3(uploadUrl, selectedFile, (pct) => {
        // console.log(`[App] Upload progress: ${pct}%`);
        setProgress(pct);
      });
      console.log('[App] Upload completed successfully');

      // 3. Success
      setUploadStatus('success');
      addToast('success', 'Book uploaded successfully!');
      
      // Update status in list
      setUploadedBooks(prev => prev.map(b => b.bookId === form.bookId ? { ...b, status: 'success' } : b));
      
      // Reset after short delay
      setTimeout(() => {
        console.log('[App] Resetting form');
        resetForm();
      }, 2000);
    } catch (error) {
      console.error('[App] Upload failed:', error);
      setUploadStatus('error');
      addToast('error', 'Upload failed. Please try again.');
      
      // Update status in list
      setUploadedBooks(prev => prev.map(b => b.bookId === form.bookId ? { ...b, status: 'error' } : b));
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 selection:bg-zinc-800">
      
      {/* Header */}
      <header className="border-b border-zinc-900 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold tracking-tight">
            <div className="p-1.5 bg-white text-black rounded-md">
              <LayoutDashboard size={18} />
            </div>
            <span>Textbook Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span>Internal Tool v1.0</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        
        <div className="flex flex-col gap-10">
          
          {/* Top Section: Upload Form */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/20 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Plus size={18} className="text-zinc-400" />
                <h2 className="text-lg font-medium text-white">Add New Book</h2>
              </div>

              <div className="space-y-4">
                {/* Book ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Book ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="bookId"
                      value={form.bookId}
                      onChange={handleFormChange}
                      disabled={uploadStatus === 'uploading'}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-700 font-mono"
                    />
                    <button 
                      onClick={refreshId} 
                      disabled={uploadStatus === 'uploading'}
                      className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-md border border-zinc-800 transition-colors disabled:opacity-50"
                      title="Generate new ID"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    disabled={uploadStatus === 'uploading'}
                    placeholder="e.g. Advanced Calculus"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-700"
                  />
                </div>

                {/* Grid for Author/Subject */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Author <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="author"
                      value={form.author}
                      onChange={handleFormChange}
                      disabled={uploadStatus === 'uploading'}
                      placeholder="e.g. John Doe"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Subject <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="subject"
                      value={form.subject}
                      onChange={handleFormChange}
                      disabled={uploadStatus === 'uploading'}
                      placeholder="e.g. Computer Science"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-700"
                    />
                  </div>
                </div>

                {/* Short Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Short Description <span className="text-red-500">*</span></label>
                    <span className={`text-xs ${form.description.length > 200 ? 'text-red-500' : 'text-zinc-500'}`}>
                      {form.description.length}/200
                    </span>
                  </div>
                  <input
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    disabled={uploadStatus === 'uploading'}
                    minLength={20}
                    maxLength={200}
                    placeholder="e.g. A comprehensive guide..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-700"
                  />
                  <p className="text-xs text-zinc-600">
                    Keep it concise for the card view (20-200 chars).
                  </p>
                </div>

                {/* Upload Zone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">PDF File <span className="text-red-500">*</span></label>
                  <UploadZone 
                    onFileSelect={setSelectedFile} 
                    selectedFile={selectedFile} 
                    onClearFile={() => setSelectedFile(null)}
                    isUploading={uploadStatus === 'uploading'}
                  />
                </div>

                {/* Progress Bar */}
                {uploadStatus === 'uploading' && (
                  <div className="space-y-2 animate-in fade-in">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Uploading...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    onClick={handleUpload}
                    disabled={uploadStatus === 'uploading' || !selectedFile || !form.title}
                    className="w-full py-2.5 px-4 bg-white text-black font-medium text-sm rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {uploadStatus === 'uploading' ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Processing
                      </>
                    ) : (
                      'Upload Book'
                    )}
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* Bottom Section: List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookIcon size={18} className="text-zinc-400" />
                <h2 className="text-lg font-medium text-white">Uploaded Library</h2>
              </div>
              <span className="text-xs text-zinc-500 px-2 py-1 bg-zinc-900 rounded border border-zinc-800">
                {uploadedBooks.length} items
              </span>
            </div>
            <BookList books={uploadedBooks} />
          </div>

        </div>
      </main>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default App;