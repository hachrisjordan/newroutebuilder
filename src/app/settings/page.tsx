import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import ErrorBoundary from '@/components/ui/error-boundary';

// Dynamically import components with proper error boundaries
const SeatsAeroConnectionStatus = dynamic(
  () => import('@/components/auth-wizard/seatsaero-connection-status').then(mod => ({ default: mod.SeatsAeroConnectionStatus })),
  { 
    ssr: false,
    loading: () => <OAuthConnectionSkeleton />
  }
);

const ApiKeySettings = dynamic(
  () => import('@/components/settings/api-key-settings'), 
  { 
    ssr: false,
    loading: () => <ApiKeySettingsSkeleton />
  }
);

// Loading skeleton components
function OAuthConnectionSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApiKeySettingsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function SettingsPage() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/auth');
    }

    // Check if user has Owner role with error handling
    let isOwner = false;
    try {
      const supabase = createSupabaseServerClient();
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Continue without admin access rather than failing
      } else {
        isOwner = profile?.role === 'Owner';
      }
    } catch (profileError) {
      console.error('Error in profile query:', profileError);
      // Continue without admin access rather than failing
    }

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

          {/* OAuth Connections - Wrapped in Suspense and Error Boundary for better error handling */}
          <ErrorBoundary>
            <Suspense fallback={<OAuthConnectionSkeleton />}>
              <SeatsAeroConnectionStatus />
            </Suspense>
          </ErrorBoundary>

          {/* API Key Settings - Wrapped in Suspense and Error Boundary */}
          <ErrorBoundary>
            <Suspense fallback={<ApiKeySettingsSkeleton />}>
              <ApiKeySettings />
            </Suspense>
          </ErrorBoundary>
          
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
  } catch (error) {
    console.error('Error in SettingsPage:', error);
    
    // Return a user-friendly error page instead of crashing
    return (
      <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
        <div className="w-full max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-red-600">Error Loading Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                There was an error loading your settings. Please try refreshing the page.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }
} 