'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

interface Profile {
  id: string;
  api_key: string | null;
  min_reliability_percent: number;
}

const UserMenu = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [minReliabilityPercent, setMinReliabilityPercent] = useState<number>(100);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setIsLoading(true);
      setHasError(null);
      setSaveSuccess(false);
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setHasError(error?.message || 'Failed to fetch user');
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }
      setUser(data.user as User);
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, api_key, min_reliability_percent')
        .eq('id', data.user.id)
        .single();
      if (profileError) {
        setHasError(profileError.message);
        setProfile(null);
      } else {
        setProfile(profileData as Profile);
        setApiKey(profileData?.api_key || '');
        setMinReliabilityPercent(
          typeof profileData?.min_reliability_percent === 'number'
            ? profileData.min_reliability_percent
            : 100
        );
      }
      setIsLoading(false);
    };
    fetchUserAndProfile();
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    setHasError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setHasError(error.message);
    } else {
      setUser(null);
      window.location.href = '/auth';
    }
    setIsLoading(false);
  };

  const handleSaveApiKey = async () => {
    if (!user) return;
    setIsSaving(true);
    setHasError(null);
    setSaveSuccess(false);
    if (minReliabilityPercent < 0 || minReliabilityPercent > 100) {
      setHasError('Min Reliability % must be between 0 and 100');
      setIsSaving(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from('profiles')
      .update({ api_key: apiKey, min_reliability_percent: minReliabilityPercent })
      .eq('id', user.id);
    if (error) {
      setHasError(error.message);
      setSaveSuccess(false);
    } else {
      setSaveSuccess(true);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading…</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-sm p-6 space-y-4 shadow-lg mx-auto mt-8">
      <div className="flex flex-col items-center gap-2">
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt="User avatar"
            className="w-16 h-16 rounded-full border"
            width={64}
            height={64}
            loading="lazy"
          />
        )}
        <div className="font-semibold text-lg">{user.user_metadata?.name || user.email}</div>
        <div className="text-sm text-muted-foreground">{user.email}</div>
      </div>
      <div className="space-y-2">
        <label htmlFor="api-key" className="block text-sm font-medium">API Key</label>
        <input
          id="api-key"
          type="text"
          className="w-full px-3 py-2 border rounded bg-background text-foreground"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          disabled={isSaving}
          autoComplete="off"
        />
        <label htmlFor="min-reliability-percent" className="block text-sm font-medium mt-4">Min Reliability %</label>
        <input
          id="min-reliability-percent"
          type="number"
          min={0}
          max={100}
          step={1}
          className="w-full px-3 py-2 border rounded bg-background text-foreground"
          value={minReliabilityPercent}
          onChange={e => setMinReliabilityPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
          disabled={isSaving}
        />
        <Button onClick={handleSaveApiKey} className="w-full" disabled={isSaving || isLoading}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
        {saveSuccess && <div className="text-green-600 text-sm text-center">API key saved!</div>}
      </div>
      <Button onClick={handleSignOut} className="w-full" variant="destructive" disabled={isLoading}>
        Sign out
      </Button>
      {hasError && <div className="text-sm text-red-600 text-center">{hasError}</div>}
    </Card>
  );
};

export default UserMenu; 