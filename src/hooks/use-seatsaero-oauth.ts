/**
 * Custom hook for managing Seats.aero OAuth state and tokens
 */

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface SeatsAeroTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

interface UseSeatsAeroOAuthReturn {
  tokens: SeatsAeroTokens | null;
  isLoading: boolean;
  hasError: string | null;
  isAuthenticated: boolean;
  refreshTokens: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useSeatsAeroOAuth(): UseSeatsAeroOAuthReturn {
  const [tokens, setTokens] = useState<SeatsAeroTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const supabase = createSupabaseBrowserClient();

  // Check if user has valid Seats.aero tokens
  const checkTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setIsAuthenticated(false);
        setTokens(null);
        return;
      }

      const userMetadata = user.user_metadata;
      const storedTokens = userMetadata?.seatsaero_tokens;

      if (!storedTokens) {
        setIsAuthenticated(false);
        setTokens(null);
        return;
      }

      // Check if tokens are expired
      const now = Date.now();
      if (storedTokens.expiresAt <= now) {
        // Tokens are expired, try to refresh
        await refreshTokens();
        return;
      }

      setTokens(storedTokens);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error checking tokens:', error);
      setHasError('Failed to check authentication status');
      setIsAuthenticated(false);
      setTokens(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase.auth]);

  // Refresh access token using refresh token
  const refreshTokens = useCallback(async () => {
    try {
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('https://api.bbairtools.com/api/seats-auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh tokens');
      }

      const newTokens = await response.json();
      setTokens(newTokens);
      setIsAuthenticated(true);
      setHasError(null);
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      setHasError('Failed to refresh authentication tokens');
      setIsAuthenticated(false);
      setTokens(null);
    }
  }, [tokens?.refreshToken]);

  // Sign out and clear tokens
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setTokens(null);
      setIsAuthenticated(false);
      setHasError(null);
    } catch (error) {
      console.error('Error signing out:', error);
      setHasError('Failed to sign out');
    }
  }, [supabase.auth]);

  // Check tokens on mount and when user changes
  useEffect(() => {
    checkTokens();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await checkTokens();
        } else if (event === 'SIGNED_OUT') {
          setTokens(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [checkTokens, supabase.auth]);

  // Auto-refresh tokens before they expire
  useEffect(() => {
    if (!tokens?.expiresAt) return;

    const timeUntilExpiry = tokens.expiresAt - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0); // Refresh 5 minutes before expiry

    const timeoutId = setTimeout(() => {
      refreshTokens();
    }, refreshTime);

    return () => clearTimeout(timeoutId);
  }, [tokens?.expiresAt, refreshTokens]);

  return {
    tokens,
    isLoading,
    hasError,
    isAuthenticated,
    refreshTokens,
    signOut,
  };
}
