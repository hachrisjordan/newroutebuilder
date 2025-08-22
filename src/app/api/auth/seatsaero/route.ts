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
  calculateExpirationTime,
  SEATS_AERO_OAUTH_CONFIG
} from '@/lib/seatsaero-oauth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('=== SEATS.AERO OAUTH API START ===');
    console.log('Starting Seats.aero OAuth processing...');
    
    // Log environment variables (without exposing secrets)
    console.log('Environment check:', {
      hasClientId: !!process.env.CLIENT_ID,
      hasClientSecret: !!process.env.CLIENT_SECRET,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    
    // Validate OAuth configuration
    console.log('Validating OAuth config...');
    validateOAuthConfig();
    console.log('OAuth config validation passed');

    console.log('Parsing request body...');
    const { code, state } = await request.json();
    console.log('Received code and state:', { 
      code: code ? `PRESENT (${code.substring(0, 20)}...)` : 'MISSING', 
      state: state ? `PRESENT (${state})` : 'MISSING' 
    });

    if (!code || !state) {
      console.log('Missing parameters, returning 400');
      return NextResponse.json(
        { error: 'Missing required parameters: code and state' },
        { status: 400 }
      );
    }

    console.log('=== ABOUT TO CALL EXCHANGE CODE FOR TOKENS ===');
    console.log('Parameters being sent:', {
      code,
      state,
      expectedRedirectUri: 'https://www.bbairtools.com/seatsaero'
    });
    
    // DEBUG: Show exactly what we're about to send to Seats.aero
    console.log('=== DEBUG: COMPARING WITH WORKING CURL ===');
    console.log('Your working curl uses:');
    console.log('- redirect_uri: "https://www.bbairtools.com/seatsaero"');
    console.log('- grant_type: "authorization_code"');
    console.log('- scope: "openid"');
    console.log('Our request will use:');
    console.log('- redirect_uri:', SEATS_AERO_OAUTH_CONFIG.redirectUri);
    console.log('- grant_type: authorization_code');
    console.log('- scope: openid');
    console.log('==========================================');
    
    // Exchange authorization code for tokens
    console.log('Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, state);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: 400 }
      );
    }
    console.log('Token exchange successful');

    // Get user info from Seats.aero
    console.log('Getting user info from Seats.aero...');
    const userInfo = await getUserInfo(tokens.access_token);
    if (!userInfo) {
      return NextResponse.json(
        { error: 'Failed to get user info from Seats.aero' },
        { status: 500 }
      );
    }
    console.log('User info retrieved:', { id: userInfo.sub, email: userInfo.email ? 'PRESENT' : 'MISSING' });

    // Calculate expiration time
    const expiresAt = calculateExpirationTime(tokens.expires_in);
    console.log('Expiration calculated:', expiresAt);

    // Check if profile exists
    console.log('Checking for existing profile...');
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
      console.log('Updating existing profile...');
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
      console.log('Profile updated successfully');
    } else {
      console.log('Creating new profile...');
      // Check if a user with this email already exists (from Google OAuth or other providers)
      let existingUser = null;
      
      if (userInfo.email) {
        console.log('Checking for existing user by email...');
        const { data: userByEmail, error: emailError } = await supabase.auth.admin.listUsers();
        if (!emailError) {
          existingUser = userByEmail.users.find(user => 
            user.email === userInfo.email && user.email_confirmed_at
          );
          console.log('Existing user found:', existingUser ? 'YES' : 'NO');
        }
      }

      let supabaseUser;
      
      if (existingUser) {
        console.log('Linking to existing user...');
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
        console.log('User metadata updated');
      } else {
        console.log('Creating new Supabase user...');
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
          console.log('New Supabase user created');
        } catch (error) {
          console.error('Error with Supabase user creation:', error);
          return NextResponse.json(
            { error: 'Failed to create user account' },
            { status: 500 }
          );
        }
      }

      // Now create the profile with the Supabase user ID
      console.log('Creating profile...');
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
      console.log('Profile created successfully');
    }

    // Build the redirect URL to Supabase auth callback
    console.log('Building redirect URL...');
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
    
    console.log('OAuth processing completed successfully');
    
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
    console.error('=== SEATS.AERO OAUTH API ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'No message');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Full error object:', error);
    console.error('=====================================');
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name
      },
      { status: 500 }
    );
  }
}
