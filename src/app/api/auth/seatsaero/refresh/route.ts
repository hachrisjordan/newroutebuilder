/**
 * Seats.aero OAuth Token Refresh API Route
 * Handles refreshing access tokens using refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken, calculateExpirationTime, validateOAuthConfig } from '@/lib/seatsaero-oauth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Validate OAuth configuration first
    validateOAuthConfig();

    const { refreshToken } = await request.json();

    // Validate required parameters
    if (!refreshToken) {
      return NextResponse.json(
        { message: 'Missing refresh token' },
        { status: 400 }
      );
    }

    // Refresh the access token
    const tokenResponse = await refreshAccessToken(refreshToken);
    
    // Initialize Supabase client
    const supabase = createSupabaseServerClient();

    // Get the current user to update their tokens
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Calculate new expiration time
    const expiresAt = calculateExpirationTime(tokenResponse.expires_in);
    const now = Date.now();

    // Update the stored tokens
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        seatsaero_tokens: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt,
          createdAt: user.user_metadata?.seatsaero_tokens?.createdAt || now,
          updatedAt: now
        }
      }
    });

    if (updateError) {
      console.error('Error updating tokens:', updateError);
      return NextResponse.json(
        { message: 'Failed to update authentication tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Tokens refreshed successfully',
      tokens: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
        createdAt: user.user_metadata?.seatsaero_tokens?.createdAt || now,
        updatedAt: now
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'An unexpected error occurred during token refresh' },
      { status: 500 }
    );
  }
}
