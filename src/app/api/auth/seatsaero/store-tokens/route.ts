import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { tokens, userInfo, expiresIn } = await request.json();
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
    
    // Find user by email
    const { data: userByEmail, error: emailError } = await supabase.auth.admin.listUsers();
    if (emailError) {
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }
    
    const existingUser = userByEmail.users.find(user => 
      user.email === userInfo.email && user.email_confirmed_at
    );
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', existingUser.id)
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
          id: existingUser.id,
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
