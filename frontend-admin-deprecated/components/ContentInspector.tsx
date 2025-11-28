import React, { useState } from 'react';
import { Search, FileText, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

interface ContentInspectorProps {
  bookId: string;
  apiEndpoint: string;
}

interface PageData {
  page: number;
  charCount: number;
  preview: string;
  fullText: string;
}

interface InspectionData {
  bookId: string;
  totalPages: number;
  totalCharacters: number;
  avgCharactersPerPage: number;
  pages: PageData[];
}

export const ContentInspector: React.FC<ContentInspectorProps> = ({ bookId, apiEndpoint }) => {
  const [data, setData] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);

  const inspectContent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiEndpoint}/inspect/${bookId}`);
      if (!response.ok) throw new Error('Failed to fetch content');
      
      const result = await response.json();
      setData(result);
      
      if (result.pages && result.pages.length > 0) {
        setSelectedPage(1);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getQualityStatus = () => {
    if (!data) return null;
    
    const avg = data.avgCharactersPerPage;
    if (avg < 500) return { status: 'poor', color: 'red', icon: AlertCircle };
    if (avg < 1000) return { status: 'fair', color: 'yellow', icon: AlertCircle };
    return { status: 'good', color: 'green', icon: CheckCircle };
  };

  const quality = getQualityStatus();

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-zinc-400" />
          <h3 className="text-lg font-semibold text-zinc-200">Content Inspector</h3>
        </div>
        
        <button
          onClick={inspectContent}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Search className="w-4 h-4" />
          {loading ? 'Inspecting...' : 'Inspect Content'}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Total Pages</div>
              <div className="text-2xl font-bold text-zinc-200">{data.totalPages}</div>
            </div>
            
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Total Characters</div>
              <div className="text-2xl font-bold text-zinc-200">{data.totalCharacters.toLocaleString()}</div>
            </div>
            
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Avg Chars/Page</div>
              <div className="text-2xl font-bold text-zinc-200">{data.avgCharactersPerPage}</div>
            </div>
            
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Quality</div>
              <div className="flex items-center gap-2">
                {quality && (
                  <>
                    <quality.icon className={`w-5 h-5 text-${quality.color}-400`} />
                    <span className={`text-lg font-bold text-${quality.color}-400 capitalize`}>
                      {quality.status}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quality Assessment */}
          {quality && (
            <div className={`bg-${quality.color}-950/20 border border-${quality.color}-900/30 rounded-lg p-4`}>
              <div className={`text-sm text-${quality.color}-400`}>
                {quality.status === 'poor' && (
                  <>
                    <strong>⚠️ Poor Extraction Quality</strong>
                    <p className="mt-1">Average character count is very low. Text is likely missing or out of order. Consider reprocessing the EPUB file.</p>
                  </>
                )}
                {quality.status === 'fair' && (
                  <>
                    <strong>⚠️ Fair Extraction Quality</strong>
                    <p className="mt-1">Character count is below optimal. Some content may be missing. Review the text order.</p>
                  </>
                )}
                {quality.status === 'good' && (
                  <>
                    <strong>✅ Good Extraction Quality</strong>
                    <p className="mt-1">Character count looks healthy. Verify reading order in the frontend.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Page Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {data.pages.slice(0, 20).map((page) => (
              <button
                key={page.page}
                onClick={() => setSelectedPage(page.page)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedPage === page.page
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Page {page.page}
              </button>
            ))}
            {data.pages.length > 20 && (
              <span className="text-xs text-zinc-500 px-2">
                +{data.pages.length - 20} more
              </span>
            )}
          </div>

          {/* Page Content */}
          {selectedPage && data.pages.find(p => p.page === selectedPage) && (
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-zinc-200">Page {selectedPage}</h4>
                <span className="text-xs text-zinc-500">
                  {data.pages.find(p => p.page === selectedPage)?.charCount} characters
                </span>
              </div>
              
              <div className="bg-zinc-900 rounded p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                  {data.pages.find(p => p.page === selectedPage)?.fullText}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentInspector;
