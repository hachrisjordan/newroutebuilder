"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

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

const ApiKeySettings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [minReliabilityPercent, setMinReliabilityPercent] = useState<number>(100);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setIsLoading(true);
      setHasError(null);
      setSaveSuccess(false);
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setHasError(error?.message || "Failed to fetch user");
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }
      setUser(data.user as User);
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, api_key, min_reliability_percent")
        .eq("id", data.user.id)
        .single();
      if (profileError) {
        setHasError(profileError.message);
        setProfile(null);
      } else {
        setProfile(profileData as Profile);
        setApiKey(profileData?.api_key || "");
        setMinReliabilityPercent(
          typeof profileData?.min_reliability_percent === "number"
            ? profileData.min_reliability_percent
            : 100
        );
      }
      setIsLoading(false);
    };
    fetchUserAndProfile();
  }, []);

  const handleSaveApiKey = async () => {
    if (!user) return;
    setIsSaving(true);
    setHasError(null);
    setSaveSuccess(false);
    if (minReliabilityPercent < 0 || minReliabilityPercent > 100) {
      setHasError("Min Reliability % must be between 0 and 100");
      setIsSaving(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ api_key: apiKey, min_reliability_percent: minReliabilityPercent })
      .eq("id", user.id);
    if (error) {
      setHasError(error.message);
      setSaveSuccess(false);
    } else {
      setSaveSuccess(true);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading…</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-2 mt-6">
      <label htmlFor="api-key" className="block text-sm font-medium">
        seats.aero API Key
      </label>
      <input
        id="api-key"
        type="password"
        className="w-full px-3 py-2 border rounded bg-background text-foreground"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
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
      <Button
        onClick={handleSaveApiKey}
        className="w-full"
        disabled={isSaving || isLoading}
      >
        {isSaving ? "Saving…" : "Save"}
      </Button>
      {saveSuccess && (
        <div className="text-green-600 text-sm text-center">API key saved!</div>
      )}
      {hasError && (
        <div className="text-sm text-red-600 text-center">{hasError}</div>
      )}
    </div>
  );
};

export default ApiKeySettings; 