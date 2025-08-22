import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

export const createSupabaseServerClient = () => {
  try {
    const cookieStore = cookies();
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: (key: string) => cookieStore.get(key)?.value,
        set: (key: string, value: string, options: any) => {},
        remove: (key: string, options: any) => {},
      },
      // Add additional configuration for better error handling
      global: {
        headers: {
          'X-Client-Info': 'newroutebuilder-web',
        },
      },
    });
  } catch (error) {
    console.error('Error creating Supabase server client:', error);
    throw new Error('Failed to create Supabase client');
  }
};

export const createSupabaseAdminClient = () => {
  try {
    if (!supabaseServiceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }
    
    return createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        get: () => '',
        set: () => {},
        remove: () => {},
      },
      // Add additional configuration for better error handling
      global: {
        headers: {
          'X-Client-Info': 'newroutebuilder-admin',
        },
      },
    });
  } catch (error) {
    console.error('Error creating Supabase admin client:', error);
    throw new Error('Failed to create Supabase admin client');
  }
};

// Helper function to handle Supabase operations with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
} 