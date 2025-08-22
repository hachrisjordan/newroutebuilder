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

    // Check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('seats_aero_user_id', userInfo.sub)
      .single();

    let profileId: string | null = null;

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to check existing profile' },
        { status: 500 }
      );
    }

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          seats_aero_access_token: tokens.access_token,
          seats_aero_refresh_token: tokens.refresh_token,
          seats_aero_token_expires_at: expiresAt,
          seats_aero_user_email: userInfo.email,
          seats_aero_user_name: userInfo.name
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
      profileId = existingProfile.id;
    } else {
      // Check if a user with this email already exists (from Google OAuth or other providers)
      let existingUser = null;
      
      if (userInfo.email) {
        const { data: userByEmail, error: emailError } = await supabase.auth.admin.listUsers();
        if (!emailError) {
          existingUser = userByEmail.users.find(user => 
            user.email === userInfo.email && user.email_confirmed_at
          );
        }
      }

      let supabaseUser;
      
      if (existingUser) {
        // Link Seats.aero to existing user account
        supabaseUser = existingUser;
        
        // Update user metadata to include Seats.aero info
        const { error: updateUserError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              ...existingUser.user_metadata,
              seatsaero_linked: true,
              seatsaero_user_id: userInfo.sub,
              seatsaero_linked_at: new Date().toISOString(),
              linked_providers: [
                ...(existingUser.user_metadata?.linked_providers || []),
                'seatsaero'
              ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
            }
          }
        );

        if (updateUserError) {
          console.error('Error updating existing user metadata:', updateUserError);
          // Continue anyway, this is not critical
        }
      } else {
        // Create a new Supabase user
        try {
          const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
            email: userInfo.email || `${userInfo.sub}@seatsaero.oauth`,
            user_metadata: {
              name: userInfo.name || 'Seats.aero User',
              provider: 'seatsaero',
              seatsaero_user_id: userInfo.sub,
              seatsaero_linked_at: new Date().toISOString(),
              linked_providers: ['seatsaero']
            },
            email_confirm: true
          });

          if (createUserError) {
            console.error('Error creating Supabase user:', createUserError);
            return NextResponse.json(
              { error: 'Failed to create user account' },
              { status: 500 }
            );
          }
          supabaseUser = newUser.user;
        } catch (error) {
          console.error('Error with Supabase user creation:', error);
          return NextResponse.json(
            { error: 'Failed to create user account' },
            { status: 500 }
          );
        }
      }

      // Now create the profile with the Supabase user ID
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: supabaseUser.id, // Use the Supabase user ID
          seats_aero_user_id: userInfo.sub,
          seats_aero_user_email: userInfo.email,
          seats_aero_user_name: userInfo.name,
          seats_aero_access_token: tokens.access_token,
          seats_aero_refresh_token: tokens.refresh_token,
          seats_aero_token_expires_at: expiresAt,
          role: 'User', // Set default role
          min_reliability_percent: 85 // Set default value
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }
      profileId = newProfile.id;
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
