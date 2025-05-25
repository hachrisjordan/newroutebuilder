'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

const UserMenu = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setHasError(null);
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setHasError(error.message);
        setUser(null);
      } else {
        setUser(data.user as User);
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    setHasError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setHasError(error.message);
    } else {
      setUser(null);
      window.location.href = '/auth';
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading…</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-sm p-6 space-y-4 shadow-lg mx-auto mt-8">
      <div className="flex flex-col items-center gap-2">
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt="User avatar"
            className="w-16 h-16 rounded-full border"
            width={64}
            height={64}
            loading="lazy"
          />
        )}
        <div className="font-semibold text-lg">{user.user_metadata?.name || user.email}</div>
        <div className="text-sm text-muted-foreground">{user.email}</div>
      </div>
      <Button onClick={handleSignOut} className="w-full" variant="destructive" disabled={isLoading}>
        Sign out
      </Button>
      {hasError && <div className="text-sm text-red-600 text-center">{hasError}</div>}
    </Card>
  );
};

export default UserMenu; 