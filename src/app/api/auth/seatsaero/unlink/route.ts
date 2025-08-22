import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user using server-side Supabase client
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
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
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to unlink Seats.aero' },
        { status: 500 }
      );
    }

    // Update user metadata using admin client
    try {
      const adminSupabase = createSupabaseAdminClient();
      const currentMetadata = user.user_metadata || {};
      const linkedProviders = currentMetadata.linked_providers || [];
      
      const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...currentMetadata,
            seatsaero_linked: false,
            seatsaero_user_id: null,
            linked_providers: linkedProviders.filter((p: string) => p !== 'seatsaero')
          }
        }
      );

      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        // Continue anyway, this is not critical
      }
    } catch (adminError) {
      console.error('Error with admin client:', adminError);
      // Continue anyway, this is not critical
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
