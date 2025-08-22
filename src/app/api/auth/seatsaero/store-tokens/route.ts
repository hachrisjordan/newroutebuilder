import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { tokens, userInfo, expiresIn } = await request.json();
    
    // Get the current user from the auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No valid auth token' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
    }
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
    
    // Check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          seats_aero_user_id: userInfo.sub,
          seats_aero_access_token: tokens.access_token,
          seats_aero_refresh_token: tokens.refresh_token,
          seats_aero_token_expires_at: expiresAt,
          seats_aero_user_email: userInfo.email,
          seats_aero_user_name: userInfo.name
        })
        .eq('id', existingProfile.id);
      
      if (updateError) {
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          seats_aero_user_id: userInfo.sub,
          seats_aero_access_token: tokens.access_token,
          seats_aero_refresh_token: tokens.refresh_token,
          seats_aero_token_expires_at: expiresAt,
          seats_aero_user_email: userInfo.email,
          seats_aero_user_name: userInfo.name,
          role: 'User',
          min_reliability_percent: 85
        });
      
      if (insertError) {
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
