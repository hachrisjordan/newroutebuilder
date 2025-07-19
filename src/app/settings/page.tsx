import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';

const ApiKeySettings = dynamic(() => import('@/components/settings/api-key-settings'), { ssr: false });

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }
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
        </CardContent>
      </Card>
    </main>
  );
} 