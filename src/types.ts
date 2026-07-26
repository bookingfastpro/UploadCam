export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface QueuedPhoto {
  id: string;
  uri: string;         // object URL or data URL for display
  base64?: string;     // raw base64 JPEG (no data: prefix) for upload
  filename: string;
  timestamp: number;
  status: UploadStatus;
  error?: string;
  retryCount: number;
  fileSize?: number;
  progress?: number;
  driveFileId?: string;
  drivePath?: string;
}

export interface GoogleAuthState {
  accessToken: string | null;
  tokenExpiry: number | null;
  email: string | null;
}

export interface AppStats {
  total: number;
  pending: number;
  uploading: number;
  success: number;
  error: number;
}
