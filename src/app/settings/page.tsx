import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { SeatsAeroConnectionStatus } from '@/components/auth-wizard/seatsaero-connection-status';
import ErrorBoundary from '@/components/ui/error-boundary';

// Force this page to be dynamic
export const dynamic = 'force-dynamic';

const ApiKeySettings = dynamicImport(() => import('@/components/settings/api-key-settings'), { ssr: false });

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }

  // Check if user has Owner role and get OAuth data server-side with retry logic
  let profile = null;
  let profileError = null;
  
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('role, seats_aero_access_token, seats_aero_user_email, seats_aero_user_name')
      .eq('id', user.id)
      .single();
    
    if (error) {
      profileError = error;
      console.error('Error fetching profile:', error);
    } else {
      profile = data;
    }
  } catch (error) {
    profileError = error;
    console.error('Unexpected error fetching profile:', error);
  }

  const isOwner = profile?.role === 'Owner';
  
  // Prepare OAuth data for the client component with fallbacks
  const oauthData = {
    google: {
      linked: user.app_metadata?.provider === 'google' || 
               user.user_metadata?.provider === 'google' ||
               (user.user_metadata?.linked_providers || []).includes('google'),
      email: user.email,
      lastLinked: user.created_at
    },
    seatsAero: {
      linked: !!(profile?.seats_aero_access_token),
      email: profile?.seats_aero_user_email || null,
      lastLinked: profile?.seats_aero_access_token ? 'Connected' : undefined
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* User Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={user.user_metadata?.name || ''}
                readOnly
                className="w-full px-3 py-2 border rounded bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full px-3 py-2 border rounded bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
          </CardContent>
        </Card>

        {/* OAuth Connections */}
        <ErrorBoundary>
          <SeatsAeroConnectionStatus initialOAuthData={oauthData} />
        </ErrorBoundary>

        {/* API Key Settings */}
        <ApiKeySettings />
        
        {/* Admin Settings */}
        {isOwner && (
          <Card>
            <CardContent className="pt-6">
              <Link href="/settings/admin">
                <Button className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
} 