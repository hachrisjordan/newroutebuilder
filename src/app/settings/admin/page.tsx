import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';

const AircraftConfigTab = dynamic(() => import('@/components/settings/aircraft-config-tab'), { ssr: false });

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }

  // Check if user has Owner role
  const supabase = createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || profile?.role !== 'Owner') {
    redirect('/settings');
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <CardTitle className="text-xl">Admin Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="aircraft-config" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="aircraft-config">Aircraft Configuration</TabsTrigger>
            </TabsList>
            <TabsContent value="aircraft-config" className="mt-6">
              <AircraftConfigTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
} 