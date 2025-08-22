/**
 * Seats.aero OAuth Token Refresh API Route
 * Handles refreshing access tokens using refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  refreshAccessToken, 
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

    const { refresh_token, user_id } = await request.json();

    if (!refresh_token || !user_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: refresh_token and user_id' },
        { status: 400 }
      );
    }

    // Refresh the access token
    const tokens = await refreshAccessToken(refresh_token);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 400 }
      );
    }

    // Calculate expiration time
    const expiresAt = calculateExpirationTime(tokens.expires_in);

    // Update the user's tokens in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        seats_aero_access_token: tokens.access_token,
        seats_aero_refresh_token: tokens.refresh_token,
        seats_aero_token_expires_at: expiresAt
      })
      .eq('seats_aero_user_id', user_id);

    if (updateError) {
      console.error('Error updating tokens:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
      access_token: tokens.access_token,
      expires_at: expiresAt
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
