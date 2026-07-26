const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file email profile';

const TOKEN_KEY = 'uploadcam_google_token';
const FOLDER_KEY = 'uploadcam_folder_ids';

// ─── Token storage ────────────────────────────────────────────────────────────

interface TokenData {
  accessToken: string;
  expiresAt: number;
  email?: string;
}

export function saveToken(data: TokenData) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
}

export function loadToken(): TokenData | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? (JSON.parse(raw) as TokenData) : null;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(FOLDER_KEY);
}

export function isTokenValid(token: TokenData): boolean {
  return Date.now() < token.expiresAt - 60_000;
}

export async function getValidToken(): Promise<string | null> {
  const token = loadToken();
  if (token && isTokenValid(token)) return token.accessToken;
  return null;
}

// ─── OAuth implicit flow (popup) ──────────────────────────────────────────────

export function startOAuth(): Promise<string | null> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: window.location.origin,
    response_type: 'token',
    scope: SCOPES,
    include_granted_scopes: 'true',
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  return new Promise((resolve) => {
    const popup = window.open(authUrl, '_blank', 'width=520,height=620,left=200,top=100');
    if (!popup) { resolve(null); return; }

    const timer = setInterval(() => {
      try {
        if (popup.closed) { clearInterval(timer); resolve(null); return; }
        const hash = popup.location.hash;
        if (hash?.includes('access_token')) {
          clearInterval(timer);
          popup.close();
          const p = new URLSearchParams(hash.slice(1));
          resolve(p.get('access_token'));
        }
      } catch {
        // cross-origin — keep waiting
      }
    }, 200);

    setTimeout(() => { clearInterval(timer); popup.close(); resolve(null); }, 120_000);
  });
}

// ─── Folder management ────────────────────────────────────────────────────────

function loadFolderCache(): Record<string, string> {
  const raw = localStorage.getItem(FOLDER_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveFolderCache(cache: Record<string, string>) {
  localStorage.setItem(FOLDER_KEY, JSON.stringify(cache));
}

async function getOrCreateFolder(
  name: string,
  parentId: string | null,
  token: string
): Promise<string> {
  const cache = loadFolderCache();
  const key = `${parentId ?? 'root'}/${name}`;
  if (cache[key]) return cache[key];

  const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId ?? 'root'}' in parents and trashed=false`;
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { files } = await search.json();
  if (files?.length) {
    cache[key] = files[0].id;
    saveFolderCache(cache);
    return files[0].id;
  }

  const body: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const created = await res.json();
  cache[key] = created.id;
  saveFolderCache(cache);
  return created.id;
}

export async function ensureDateFolders(
  token: string,
  date = new Date()
): Promise<{ folderId: string; path: string }> {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const root = await getOrCreateFolder('UploadCam', null, token);
  const yearId = await getOrCreateFolder(year, root, token);
  const monthId = await getOrCreateFolder(month, yearId, token);
  const dayId = await getOrCreateFolder(day, monthId, token);

  return { folderId: dayId, path: `/UploadCam/${year}/${month}/${day}/` };
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadToDrive(
  token: string,
  folderId: string,
  filename: string,
  base64: string,
  onProgress?: (p: number) => void
): Promise<string> {
  // base64 must be raw (no data: prefix)
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const blob = new Blob([bytes], { type: 'image/jpeg' });
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });
  const form = new FormData();
  form.append('metadata', new Blob([metadata], { type: 'application/json' }));
  form.append('file', blob);

  onProgress?.(0.1);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );

  onProgress?.(1);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `Upload HTTP ${res.status}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}
