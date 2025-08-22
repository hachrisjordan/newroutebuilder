import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('min_reliability_percent')
    .eq('id', userData.user.id)
    .single();
  if (profileError) {
    return NextResponse.json({ min_reliability_percent: 100 });
  }
  return NextResponse.json({ min_reliability_percent: typeof profile?.min_reliability_percent === 'number' ? profile.min_reliability_percent : 100 });
} 