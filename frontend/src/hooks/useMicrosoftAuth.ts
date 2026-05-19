/**
 * Covasant Continuum — Microsoft Entra ID (Azure AD) Auth Hook
 * Adapted from useIDAAuth — redirect-based SSO via an external auth service.
 *
 * Set these in your frontend .env:
 *   VITE_AUTH_BASE_URL=https://your-auth-service.run.app
 *   VITE_AUTH_CLIENT_ID=continuum
 */

import { useState, useEffect, useCallback } from 'react';

export interface MsUserInfo {
  name?: string;
  email?: string;
  username?: string;
}

const AUTH_BASE_URL = 'https://auth-service-backend-273497745552.us-central1.run.app';
const CLIENT_ID = 'con-1';

function parseJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    const parsed = JSON.parse(json);
    return {
      name: parsed.name || parsed.given_name || parsed.preferred_username || parsed.sub,
      email: parsed.email || parsed.mail,
      username: parsed.preferred_username || parsed.sub,
      sub: parsed.sub,
      roles: parsed.roles || parsed.realm_access?.roles || [],
    };
  } catch {
    return null;
  }
}

export function useMicrosoftAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = !!AUTH_BASE_URL;

  /**
   * Redirect user to the Microsoft login page via the auth service.
   */
  const loginWithMicrosoft = useCallback(() => {
    if (!AUTH_BASE_URL) {
      setError('Microsoft SSO not configured. Set VITE_AUTH_BASE_URL in frontend .env.');
      return;
    }
    // Use the current origin so that both localhost and Cloud Run work correctly
    const redirectUri = encodeURIComponent(window.location.origin + '/');
    // Append prompt=select_account to force Microsoft to ask for account selection
    window.location.href = `${AUTH_BASE_URL}/login/${CLIENT_ID}?prompt=select_account&redirect_uri=${redirectUri}`;
  }, []);

  /**
   * Handle the callback after Microsoft login redirect.
   * The auth service redirects back with tokens in the URL hash.
   * Returns { email, name, accessToken } on success, null on failure.
   */
  const handleMicrosoftCallback = useCallback(async (): Promise<{
    email: string;
    name: string;
    accessToken: string;
  } | null> => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    if (params.get('success') !== 'true') return null;

    const accessToken = params.get('access_token');
    const idToken = params.get('id_token');

    if (!idToken && !accessToken) return null;

    // Decode the ID token to get user info
    const decoded = idToken ? parseJwt(idToken) : null;
    const email = decoded?.email;
    const name = decoded?.name || email?.split('@')[0] || 'User';

    if (!email) {
      setError('Could not retrieve email from Microsoft token.');
      return null;
    }

    // Clean the URL hash
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch {}

    return { email, name, accessToken: accessToken || '' };
  }, []);

  // Check for callback on mount
  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      setLoading(true);
    }
  }, []);

  return {
    loginWithMicrosoft,
    handleMicrosoftCallback,
    isConfigured,
    loading,
    setLoading,
    error,
    setError,
  };
}
