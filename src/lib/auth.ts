import { createSupabaseServerClient } from './supabase-server';

/**
 * Returns the current user from Supabase (server-side).
 */
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
} 