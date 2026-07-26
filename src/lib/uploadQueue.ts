import type { QueuedPhoto } from '@/types';
import { getValidToken, ensureDateFolders, uploadToDrive } from './googleDrive';
import { saveQueue } from './photoStorage';

const MAX_RETRIES = 3;

export async function processQueue(
  queue: QueuedPhoto[],
  onUpdate: (q: QueuedPhoto[]) => void
): Promise<QueuedPhoto[]> {
  const token = await getValidToken();
  if (!token) return queue;

  let current = [...queue];

  const pending = current.filter(
    (p) => (p.status === 'pending' || p.status === 'error') && p.retryCount < MAX_RETRIES
  );

  for (const photo of pending) {
    if (!photo.base64) continue;

    current = current.map((p) =>
      p.id === photo.id ? { ...p, status: 'uploading' as const, progress: 0 } : p
    );
    onUpdate([...current]);

    try {
      const { folderId, path } = await ensureDateFolders(token, new Date(photo.timestamp));
      const driveFileId = await uploadToDrive(token, folderId, photo.filename, photo.base64, (progress) => {
        current = current.map((p) => (p.id === photo.id ? { ...p, progress } : p));
        onUpdate([...current]);
      });

      current = current.map((p) =>
        p.id === photo.id
          ? { ...p, status: 'success' as const, progress: 1, driveFileId, drivePath: path, base64: undefined }
          : p
      );
    } catch (err) {
      const retryCount = photo.retryCount + 1;
      current = current.map((p) =>
        p.id === photo.id
          ? {
              ...p,
              status: retryCount >= MAX_RETRIES ? ('error' as const) : ('pending' as const),
              error: err instanceof Error ? err.message : 'Upload failed',
              retryCount,
              progress: undefined,
            }
          : p
      );
    }

    onUpdate([...current]);
    await saveQueue(current);
  }

  return current;
}

export function getStats(queue: QueuedPhoto[]) {
  return {
    total: queue.length,
    pending: queue.filter((p) => p.status === 'pending').length,
    uploading: queue.filter((p) => p.status === 'uploading').length,
    success: queue.filter((p) => p.status === 'success').length,
    error: queue.filter((p) => p.status === 'error').length,
  };
}
