/**
 * Seats.aero OAuth Token Exchange API Route
 * Handles exchanging authorization code for access and refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  exchangeCodeForTokens, 
  getUserInfo, 
  calculateExpirationTime,
  validateOAuthConfig
} from '@/lib/seatsaero-oauth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Validate OAuth configuration first
    validateOAuthConfig();

    const { code, state } = await request.json();

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.json(
        { message: 'Missing required parameters: code and state' },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await exchangeCodeForTokens(code, state);
    
    // Get user information using the access token
    const userInfo = await getUserInfo(tokenResponse.access_token);

    // Initialize Supabase client
    const supabase = createSupabaseServerClient();

    // Check if user exists, create if not
    let { data: user, error: userError } = await supabase.auth.admin.getUserById(userInfo.sub);
    
    if (userError || !user.user) {
      // Create new user if they don't exist
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userInfo.email || `${userInfo.sub}@seatsaero.oauth`,
        user_metadata: {
          name: userInfo.name || 'Seats.aero User',
          picture: userInfo.picture,
          provider: 'seatsaero',
          pro_status: userInfo.pro_status,
          subscription_end: userInfo.subscription_end
        },
        email_confirm: true
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { message: 'Failed to create user account' },
          { status: 500 }
        );
      }

      user = newUser;
    }

    // Store OAuth tokens in the database
    const expiresAt = calculateExpirationTime(tokenResponse.expires_in);
    const now = Date.now();

    // For now, we'll store tokens in user metadata
    // In production, you might want to store these in a separate table
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.user.id,
      {
        user_metadata: {
          ...user.user.user_metadata,
          seatsaero_tokens: {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt,
            createdAt: now,
            updatedAt: now
          }
        }
      }
    );

    if (updateError) {
      console.error('Error storing tokens:', updateError);
      return NextResponse.json(
        { message: 'Failed to store authentication tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Authentication successful',
      user: {
        id: user.user.id,
        email: user.user.email,
        name: user.user.user_metadata?.name,
        pro_status: userInfo.pro_status
      }
    });

  } catch (error) {
    console.error('Seats.aero OAuth error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'An unexpected error occurred during authentication' },
      { status: 500 }
    );
  }
}
