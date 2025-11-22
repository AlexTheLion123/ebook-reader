export interface Book {
  bookId: string;
  title: string;
  author?: string;
  subject?: string;
  fileName: string;
  uploadedAt: string;
  status: UploadStatus;
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface UploadResponse {
  uploadUrl: string; // Assuming the API returns this key
  [key: string]: any;
}
