import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const ApiKeySettings = dynamic(() => import('@/components/settings/api-key-settings'), { ssr: false });

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }

  // Check if user has Owner role
  const supabase = createSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.role === 'Owner';
  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Settings</CardTitle>
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
          <ApiKeySettings />
          
          {isOwner && (
            <div className="pt-4 border-t">
              <Link href="/settings/admin">
                <Button className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin Settings
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
} 