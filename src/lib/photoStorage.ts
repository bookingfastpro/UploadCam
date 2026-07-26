import type { QueuedPhoto } from '@/types';

const DB_NAME = 'UploadCam';
const STORE = 'photos';

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => { _db = (e.target as IDBOpenDBRequest).result; resolve(_db!); };
    req.onerror = () => reject(req.error);
  });
}

export async function saveQueue(photos: QueuedPhoto[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const clear = store.clear();
    clear.onsuccess = () => {
      let rem = photos.length;
      if (rem === 0) { resolve(); return; }
      for (const p of photos) {
        const put = store.put(p);
        put.onsuccess = () => { rem--; if (rem === 0) resolve(); };
        put.onerror = () => reject(put.error);
      }
    };
    clear.onerror = () => reject(clear.error);
  });
}

export async function loadQueue(): Promise<QueuedPhoto[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as QueuedPhoto[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export function generateFilename(): string {
  const n = new Date();
  const p = (v: number, l = 2) => String(v).padStart(l, '0');
  return `IMG_${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}.jpg`;
}
