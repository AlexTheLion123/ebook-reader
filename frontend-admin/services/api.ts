import { API_ENDPOINTS } from '../constants';

export const getPresignedUrl = async (bookId: string, fileName: string): Promise<string> => {
  const response = await fetch(API_ENDPOINTS.UPLOAD_INIT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookId, fileName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get upload URL: ${response.statusText}`);
  }

  // The API response structure might vary, assuming standard presigned URL response
  // If the API returns the URL directly as string or inside a property.
  const data = await response.json();
  
  // Robustness check: check common keys if specific structure unknown
  const url = data.uploadUrl || data.url || data; 
  
  if (typeof url !== 'string') {
    // Fallback if the response is complex JSON, try to find a string looking like a URL
    throw new Error('Invalid response format from upload API');
  }

  return url;
};

export const uploadFileToS3 = async (url: string, file: File, onProgress?: (progress: number) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));

    xhr.send(file);
  });
};
