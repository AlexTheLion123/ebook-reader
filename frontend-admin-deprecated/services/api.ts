import { API_ENDPOINTS } from '../constants';
import { FrontendBook } from '../types';

const FRONTEND_API_BASE = 'https://6ga7cukouj.execute-api.eu-west-1.amazonaws.com/prod';

export const getPresignedUrl = async (bookId: string, fileName: string, metadata: { title: string, author: string, description: string, subject?: string }): Promise<string> => {
  console.log(`[getPresignedUrl] Requesting URL for bookId: ${bookId}, fileName: ${fileName}`);
  console.log(`[getPresignedUrl] Endpoint: ${API_ENDPOINTS.UPLOAD_INIT}`);
  
  try {
    const response = await fetch(API_ENDPOINTS.UPLOAD_INIT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookId, fileName, ...metadata }),
    });

    console.log(`[getPresignedUrl] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getPresignedUrl] Error response body: ${errorText}`);
      throw new Error(`Failed to get upload URL: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[getPresignedUrl] Response data:`, data);
    
    const url = data.uploadUrl || data.url || data; 
    
    if (typeof url !== 'string') {
      console.error(`[getPresignedUrl] Invalid URL format received:`, url);
      throw new Error('Invalid response format from upload API');
    }

    return url;
  } catch (error) {
    console.error(`[getPresignedUrl] Exception:`, error);
    throw error;
  }
};

export const uploadFileToS3 = async (url: string, file: File, onProgress?: (progress: number) => void): Promise<void> => {
  console.log(`[uploadFileToS3] Starting upload to S3. File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
  // Log first few chars of URL to verify it looks right without leaking everything if sensitive (though presigned URLs are temporary)
  console.log(`[uploadFileToS3] Upload URL (truncated): ${url.substring(0, 50)}...`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100;
        // console.log(`[uploadFileToS3] Progress: ${percentComplete.toFixed(2)}%`); // Commented out to avoid spam
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      console.log(`[uploadFileToS3] Upload finished. Status: ${xhr.status}`);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        console.error(`[uploadFileToS3] Upload failed response:`, xhr.responseText);
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      console.error(`[uploadFileToS3] Network error occurred`);
      reject(new Error('Network error during upload'));
    };

    xhr.send(file);
  });
};

// Fetch books visible on the frontend (same endpoint as frontend uses)
export const listFrontendBooks = async (): Promise<FrontendBook[]> => {
  try {
    console.log('[listFrontendBooks] Fetching books...');
    const response = await fetch(`${FRONTEND_API_BASE}/books`);
    if (!response.ok) {
      throw new Error(`Failed to list books: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[listFrontendBooks] Response data:', data);
    
    if (Array.isArray(data)) {
        return data;
    }
    
    if (data && Array.isArray(data.books)) {
        return data.books;
    }

    console.warn('[listFrontendBooks] Unexpected response format, returning empty array');
    return [];
  } catch (error) {
    console.error('Error listing frontend books:', error);
    throw error;
  }
};

// Hide a book from the frontend (soft delete)
export const hideBook = async (bookId: string): Promise<void> => {
  try {
    const response = await fetch(`${FRONTEND_API_BASE}/books/${bookId}/hide`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hidden: true }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to hide book: ${response.statusText} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error hiding book:', error);
    throw error;
  }
};

// Unhide a book (restore to frontend)
export const unhideBook = async (bookId: string): Promise<void> => {
  try {
    const response = await fetch(`${FRONTEND_API_BASE}/books/${bookId}/hide`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hidden: false }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to unhide book: ${response.statusText} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error unhiding book:', error);
    throw error;
  }
};

export const reprocessBook = async (bookId: string): Promise<{ message: string; bookId: string; status: string }> => {
  const response = await fetch(`${API_ENDPOINTS.BOOKS}/${bookId}/reprocess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start reprocessing');
  }

  return response.json();
};

export const getBookStatus = async (bookId: string): Promise<{ status: string }> => {
  const response = await fetch(`${API_ENDPOINTS.BOOKS}/${bookId}/status`);

  if (!response.ok) {
    throw new Error('Failed to fetch book status');
  }

  return response.json();
};

