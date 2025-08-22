'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    // Get initial user with retry logic
    const getUser = async () => {
      try {
        setError(null);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw userError;
        }
        
        if (isMounted) {
          setUser(user);
        }
      } catch (error) {
        console.error('Error getting user:', error);
        
        if (isMounted) {
          setError('Failed to load user information');
          
          // Auto-retry logic for transient errors
          if (retryCount < 3) {
            setTimeout(() => {
              if (isMounted) {
                setRetryCount(prev => prev + 1);
              }
            }, 2000 * (retryCount + 1)); // Exponential backoff
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
          setIsLoading(false);
          setError(null);
          setRetryCount(0); // Reset retry count on successful auth change
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [retryCount]);

  // Manual retry function
  const retry = () => {
    setRetryCount(0);
    setError(null);
    setIsLoading(true);
  };

  return { 
    user, 
    isLoading, 
    error, 
    retry,
    hasError: !!error 
  };
}
