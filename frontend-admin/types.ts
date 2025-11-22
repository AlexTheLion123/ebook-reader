export interface Book {
  bookId: string;
  title: string;
  author?: string;
  subject?: string;
  description?: string;
  fileName: string;
  uploadedAt: string;
  status: UploadStatus;
  processingStartedAt?: string;
}

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface FrontendBook {
  bookId: string;
  title: string;
  author?: string;
  subject?: string;
  description?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface UploadResponse {
  uploadUrl: string; // Assuming the API returns this key
  [key: string]: any;
}
