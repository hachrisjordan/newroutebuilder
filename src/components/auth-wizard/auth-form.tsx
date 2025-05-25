'use client';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';

/**
 * AuthForm - Google OAuth sign in/up
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
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-sm p-6 space-y-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center">Sign in or Sign up</h1>
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
      </Card>
    </div>
  );
};

export default AuthForm; 