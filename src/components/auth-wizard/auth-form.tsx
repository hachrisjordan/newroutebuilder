'use client';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';


/**
 * AuthForm - Google OAuth and Seats.aero OAuth sign in/up
 */
const AuthForm = () => {
  const [isLoading, setIsLoading] = useState(false);

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

          {hasError && (
            <div className="text-sm text-red-600 text-center" role="alert">
              {hasError}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default AuthForm; 