import { createContext, useContext, ReactNode } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import type { GoogleAuthState, QueuedPhoto, AppStats } from '@/types';

interface AppCtx {
  isOnline: boolean;
  auth: GoogleAuthState;
  isConnected: boolean;
  authLoading: boolean;
  authError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  queue: QueuedPhoto[];
  stats: AppStats;
  processing: boolean;
  addPhoto: (uri: string, base64: string, fileSize?: number) => Promise<QueuedPhoto>;
  retryPhoto: (id: string) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  clearSuccessful: () => Promise<void>;
  runQueue: () => Promise<void>;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const isOnline = useNetworkStatus();
  const { auth, isConnected, loading: authLoading, error: authError, connect, disconnect } = useGoogleAuth();
  const { queue, stats, processing, addPhoto, retryPhoto, deletePhoto, clearSuccessful, runQueue } =
    useUploadQueue(isOnline, isConnected);

  return (
    <Ctx.Provider value={{ isOnline, auth, isConnected, authLoading, authError, connect, disconnect, queue, stats, processing, addPhoto, retryPhoto, deletePhoto, clearSuccessful, runQueue }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}
