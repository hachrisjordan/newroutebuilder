import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the user from the request (you'll need to implement proper auth)
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Remove Seats.aero tokens from the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        seats_aero_access_token: null,
        seats_aero_refresh_token: null,
        seats_aero_token_expires_at: null,
        seats_aero_user_id: null,
        seats_aero_user_email: null,
        seats_aero_user_name: null
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to unlink Seats.aero' },
        { status: 500 }
      );
    }

    // Update user metadata to remove Seats.aero info
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(user_id);
    
    if (userError) {
      console.error('Error getting user:', userError);
      // Continue anyway, this is not critical
    } else if (user.user) {
      const currentMetadata = user.user.user_metadata || {};
      const linkedProviders = currentMetadata.linked_providers || [];
      
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        user_id,
        {
          user_metadata: {
            ...currentMetadata,
            seatsaero_linked: false,
            seatsaero_user_id: null,
            linked_providers: linkedProviders.filter(p => p !== 'seatsaero')
          }
        }
      );

      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        // Continue anyway, this is not critical
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seats.aero account unlinked successfully'
    });

  } catch (error) {
    console.error('Error unlinking Seats.aero:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
