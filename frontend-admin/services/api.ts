import { API_ENDPOINTS } from '../constants';

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
