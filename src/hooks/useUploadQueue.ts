import { useCallback, useEffect, useRef, useState } from 'react';
import { loadQueue, saveQueue, generateFilename } from '@/lib/photoStorage';
import { processQueue, getStats } from '@/lib/uploadQueue';
import type { QueuedPhoto } from '@/types';

export function useUploadQueue(isOnline: boolean, isConnected: boolean) {
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => { loadQueue().then(setQueue); }, []);

  // Auto-sync when back online
  useEffect(() => {
    if (!isOnline || !isConnected || processingRef.current) return;
    const hasPending = queue.some(
      (p) => (p.status === 'pending' || p.status === 'error') && p.retryCount < 3
    );
    if (hasPending) runQueue();
  }, [isOnline, isConnected]);

  const runQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      const loaded = await loadQueue();
      const updated = await processQueue(loaded, (partial) => setQueue([...partial]));
      setQueue([...updated]);
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }, []);

  const addPhoto = useCallback(
    async (uri: string, base64: string, fileSize?: number): Promise<QueuedPhoto> => {
      const photo: QueuedPhoto = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        uri,
        base64,
        filename: generateFilename(),
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        fileSize,
      };
      const updated = [...queue, photo];
      setQueue(updated);
      await saveQueue(updated);
      if (isOnline && isConnected && !processingRef.current) setTimeout(runQueue, 300);
      return photo;
    },
    [queue, isOnline, isConnected, runQueue]
  );

  const retryPhoto = useCallback(
    async (id: string) => {
      const updated = queue.map((p) =>
        p.id === id ? { ...p, status: 'pending' as const, retryCount: 0, error: undefined } : p
      );
      setQueue(updated);
      await saveQueue(updated);
      if (isOnline && isConnected) runQueue();
    },
    [queue, isOnline, isConnected, runQueue]
  );

  const deletePhoto = useCallback(
    async (id: string) => {
      const updated = queue.filter((p) => p.id !== id);
      setQueue(updated);
      await saveQueue(updated);
    },
    [queue]
  );

  const clearSuccessful = useCallback(async () => {
    const updated = queue.filter((p) => p.status !== 'success');
    setQueue(updated);
    await saveQueue(updated);
  }, [queue]);

  return { queue, stats: getStats(queue), processing, addPhoto, retryPhoto, deletePhoto, clearSuccessful, runQueue };
}
