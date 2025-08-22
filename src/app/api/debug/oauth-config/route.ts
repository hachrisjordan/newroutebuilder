/**
 * Debug endpoint to verify OAuth configuration
 * This should only be used in development
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const config = {
    clientId: process.env.CLIENT_ID ? 'Set' : 'Not set',
    clientSecret: process.env.CLIENT_SECRET ? 'Set' : 'Not set',
    redirectUri: process.env.NEXT_PUBLIC_SEATS_AERO_REDIRECT_URI || 'https://bbairtools.com/seatsaero',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
    nodeEnv: process.env.NODE_ENV,
    hasClientId: !!process.env.CLIENT_ID,
    hasClientSecret: !!process.env.CLIENT_SECRET,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    clientIdPrefix: process.env.CLIENT_ID?.startsWith('seats:cid:') ? 'Correct format' : 'Wrong format'
  };

  return NextResponse.json(config);
}
