/**
 * Seats.aero OAuth Callback Page
 * Handles the OAuth callback after user consent
 * 
 * Return URL Priority (in order):
 * 1. returnUrl query parameter (if explicitly passed)
 * 2. seatsaero_return_url from sessionStorage (stored before OAuth initiation)
 * 3. Valid referrer from same origin (if user came from another page on the site)
 * 4. /dashboard (fallback)
 * 
 * This ensures users are redirected back to where they were before starting OAuth,
 * providing a seamless user experience.
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface OAuthResponse {
  success: boolean;
  message: string;
  user_info: {
    id: string;
    email: string;
    name: string;
  };
  error?: string; // Add optional error property
}

function SeatsAeroCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing required OAuth parameters');
          return;
        }

        // Get tokens from external API
        const tokenResponse = await fetch('https://api.bbairtools.com/api/seats-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        });

        if (!tokenResponse.ok) {
          setStatus('error');
          setMessage('Failed to get tokens from Seats.aero');
          return;
        }

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.success) {
          setStatus('error');
          setMessage('Failed to get tokens from Seats.aero');
          return;
        }

        const tokens = tokenData.data;

        // Get current user's auth token from Supabase
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          setStatus('error');
          setMessage('User not authenticated');
          return;
        }

        // Store tokens in Supabase
        const supabaseResponse = await fetch('/api/auth/seatsaero/store-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ 
            tokens, 
            userInfo: { sub: 'seatsaero_user', email: 'user@seatsaero.com', name: 'Seats.aero User' },
            expiresIn: tokens.expires_in
          }),
        });

        if (!supabaseResponse.ok) {
          setStatus('error');
          setMessage('Failed to store tokens in database');
          return;
        }

        const supabaseData = await supabaseResponse.json();
        
        if (!supabaseData.success) {
          setStatus('error');
          setMessage(supabaseData.error || 'Failed to store tokens');
          return;
        }

        setStatus('success');
        setMessage('Successfully connected to Seats.aero! Redirecting...');
        
        // Determine where to redirect the user
        const returnUrl = searchParams.get('returnUrl') || 
                         sessionStorage.getItem('seatsaero_return_url') || 
                         (document.referrer && document.referrer.includes(window.location.origin) ? 
                           new URL(document.referrer).pathname + new URL(document.referrer).search : null) || 
                         '/dashboard';
        
        // Clean up stored return URL
        sessionStorage.removeItem('seatsaero_return_url');
        
        // Redirect to the appropriate page
        setTimeout(() => {
          // If returnUrl is valid internal path, use it; otherwise default to dashboard
          if (returnUrl && returnUrl.startsWith('/') && !returnUrl.includes('seatsaero')) {
            console.log('Redirecting to:', returnUrl);
            router.push(returnUrl);
          } else {
            console.log('Redirecting to dashboard (fallback)');
            router.push('/dashboard');
          }
        }, 2000);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('An error occurred during OAuth authentication');
      }
    };

    processOAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12">
            {status === 'loading' && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            )}
            {status === 'success' && (
              <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {status === 'loading' && 'Processing OAuth...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Error'}
          </h2>
          
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>

          {status === 'success' && (
            <div className="mt-4 p-4 bg-green-50 rounded-md">
              <p className="text-sm text-green-800">
                Redirecting to complete Supabase authentication...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4">
              <button
                onClick={() => router.push('/auth')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SeatsAeroCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Loading...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Initializing OAuth callback...
            </p>
          </div>
        </div>
      </div>
    }>
      <SeatsAeroCallbackContent />
    </Suspense>
  );
}
