import { useCallback, useEffect, useState } from 'react';
import { loadToken, saveToken, clearToken, startOAuth, isTokenValid } from '@/lib/googleDrive';
import type { GoogleAuthState } from '@/types';

const INITIAL: GoogleAuthState = { accessToken: null, tokenExpiry: null, email: null };

export function useGoogleAuth() {
  const [auth, setAuth] = useState<GoogleAuthState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = loadToken();
    if (t && isTokenValid(t)) {
      setAuth({ accessToken: t.accessToken, tokenExpiry: t.expiresAt, email: t.email ?? null });
    }
  }, []);

  const isConnected = !!auth.accessToken && (auth.tokenExpiry ? isTokenValid({ accessToken: auth.accessToken, expiresAt: auth.tokenExpiry }) : false);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await startOAuth();
      if (!accessToken) { setError('Authentification annulée.'); return; }

      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user: { email?: string } = res.ok ? await res.json() : {};

      const expiresAt = Date.now() + 3600 * 1000;
      saveToken({ accessToken, expiresAt, email: user.email });
      setAuth({ accessToken, tokenExpiry: expiresAt, email: user.email ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    clearToken();
    setAuth(INITIAL);
  }, []);

  return { auth, isConnected, loading, error, connect, disconnect };
}
