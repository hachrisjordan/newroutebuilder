/**
 * Seats.aero OAuth Token Exchange API Route
 * Handles exchanging authorization code for access and refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  exchangeCodeForTokens, 
  getUserInfo, 
  validateOAuthConfig,
  calculateExpirationTime
} from '@/lib/seatsaero-oauth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Validate OAuth configuration
    validateOAuthConfig();

    const { code, state } = await request.json();

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters: code and state' },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, state);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: 400 }
      );
    }

    // Get user info from Seats.aero
    const userInfo = await getUserInfo(tokens.access_token);
    if (!userInfo) {
      return NextResponse.json(
        { error: 'Failed to get user info from Seats.aero' },
        { status: 500 }
      );
    }

    // Calculate expiration time
    const expiresAt = calculateExpirationTime(tokens.expires_in);

    // Use the database function to handle user creation/update
    const { data: profileId, error: dbError } = await supabase
      .rpc('handle_seatsaero_oauth', {
        p_user_id: userInfo.sub,
        p_email: userInfo.email,
        p_name: userInfo.name,
        p_access_token: tokens.access_token,
        p_refresh_token: tokens.refresh_token,
        p_expires_at: expiresAt
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save user data' },
        { status: 500 }
      );
    }

    // Build the redirect URL to Supabase auth callback
    // This integrates with Supabase Auth like Google OAuth does
    const supabaseAuthCallbackUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`;
    const redirectUrl = new URL(supabaseAuthCallbackUrl);
    
    // Add OAuth success parameters
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('provider', 'seatsaero');
    redirectUrl.searchParams.set('user_id', userInfo.sub);
    
    // Add user info if available
    if (userInfo.email) {
      redirectUrl.searchParams.set('email', userInfo.email);
    }
    if (userInfo.name) {
      redirectUrl.searchParams.set('name', userInfo.name);
    }
    
    // Add token information for the client to handle
    redirectUrl.searchParams.set('access_token', tokens.access_token);
    redirectUrl.searchParams.set('refresh_token', tokens.refresh_token);
    redirectUrl.searchParams.set('expires_in', tokens.expires_in.toString());
    
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Seats.aero',
      redirect_url: redirectUrl.toString(),
      user_info: {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name
      },
      profile_id: profileId
    });

  } catch (error) {
    console.error('Seats.aero OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
