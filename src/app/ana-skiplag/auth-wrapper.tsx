import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import ANASkiplagClient from './ana-skiplag-client';

export default async function ANASkiplagAuthWrapper() {
  // Authentication and authorization check
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }

  // Check user role
  const supabase = createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile || (profile.role !== 'Owner' && profile.role !== 'Pro')) {
    redirect('/auth');
  }

  // If user is authenticated and has proper role, render the client component
  return <ANASkiplagClient />;
} 