'use client';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { Plane } from 'lucide-react';
import { SEATS_AERO_CLIENT_CONFIG, buildConsentUrl, initiateOAuthFlow } from '@/lib/seatsaero-oauth';

/**
 * AuthForm - Google OAuth and Seats.aero OAuth sign in/up
 */
const AuthForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSeatsAeroLoading, setIsSeatsAeroLoading] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setHasError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      setHasError(error.message);
      setIsLoading(false);
    }
    // On success, Supabase will redirect automatically
  };

  const handleSeatsAeroSignIn = async (returnUrl?: string) => {
    try {
      setIsSeatsAeroLoading(true);
      setHasError(null);

      // Use the utility function to initiate OAuth flow
      initiateOAuthFlow(returnUrl);
      
    } catch (error) {
      console.error('Seats.aero OAuth error:', error);
      setHasError('Failed to initiate Seats.aero authentication');
      setIsSeatsAeroLoading(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Sign in or Sign up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <FcGoogle className="h-5 w-5" />
            {isLoading ? 'Redirecting…' : 'Continue with Google'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300"
            onClick={() => handleSeatsAeroSignIn()}
            disabled={isSeatsAeroLoading}
          >
            <Plane className="h-5 w-5 text-blue-600" />
            {isSeatsAeroLoading ? 'Redirecting…' : 'Sign in with Seats.aero'}
          </Button>

          {hasError && (
            <div className="text-sm text-red-600 text-center" role="alert">
              {hasError}
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>
              <strong>Seats.aero Pro users:</strong> Connect your account to access award travel data and advanced features.
            </p>
            <p>
              Your API usage limit (1,000 requests/day) is shared across all connected applications.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default AuthForm; 