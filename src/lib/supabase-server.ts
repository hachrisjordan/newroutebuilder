import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (key: string) => cookieStore.get(key)?.value,
      set: (key: string, value: string, options: any) => {
        cookieStore.set(key, value, options);
      },
      remove: (key: string, options: any) => {
        cookieStore.set(key, '', { ...options, maxAge: 0 });
      },
    },
  });
};

export const createSupabaseAdminClient = () => {
  return createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get: () => '',
      set: () => {},
      remove: () => {},
    },
  });
}; 