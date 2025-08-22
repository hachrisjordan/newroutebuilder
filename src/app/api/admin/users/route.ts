import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user has Owner role
    const supabase = createSupabaseServerClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'Owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Method 1: Try to use admin API (requires service role key)
    try {
      console.log('Attempting to use admin API with service role key...');
      
      // Create admin client with service role key
      const adminSupabase = createSupabaseAdminClient();
      
      // Check if service role key is available
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
        throw new Error('Service role key not configured');
      }
      
      console.log('Service role key found, attempting to list users...');
      
      // Fetch all users from auth.users using admin API
      const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Admin API error:', authError);
        throw authError; // Fall back to profiles-only method
      }

      console.log(`Successfully fetched ${authUsers.users.length} users from auth system`);

      // Fetch profiles to get roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
      }

      // Create a map of user IDs to roles
      const roleMap = new Map(profiles?.map(p => [p.id, p.role]) || []);

      // Combine auth users with their roles
      const usersWithRoles = authUsers.users.map(user => ({
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata || {},
        role: roleMap.get(user.id) || 'User'
      }));

      console.log(`Successfully combined ${usersWithRoles.length} real users with roles`);
      return NextResponse.json({ users: usersWithRoles });
    } catch (adminError) {
      console.log('Admin API not available, falling back to profiles-only method:', adminError);
      
      // Fallback: Use profiles-only method
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role')
        .order('id');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
      }

      // Transform profiles into user objects with basic information
      const usersWithRoles = profiles?.map(profile => ({
        id: profile.id,
        email: `user-${profile.id}@example.com`, // Placeholder
        user_metadata: {
          name: `User ${profile.id}` // Placeholder
        },
        role: profile.role || 'User'
      })) || [];

      return NextResponse.json({ users: usersWithRoles });
    }
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user has Owner role
    const supabase = createSupabaseServerClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'Owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse request body
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['User', 'Pro', 'Owner'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Use admin client to bypass RLS policies
    const adminSupabase = createSupabaseAdminClient();
    
    // Update the role in the profiles table using admin client
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({ role: role })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    console.log(`Successfully updated user ${userId} role to ${role}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 