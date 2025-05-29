'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AirportSearch } from '@/components/airport-search';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Profile {
  id: string;
  api_key: string | null;
}

export function AwardFinderSearch() {
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [maxStops, setMaxStops] = useState<number>(2);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [maxStopsError, setMaxStopsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      setIsApiKeyLoading(true);
      setApiKeyError(null);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) return;
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, api_key')
          .eq('id', data.user.id)
          .single();
        if (!profileError && profileData?.api_key) {
          setApiKey(profileData.api_key);
        }
      } catch (err) {
        setApiKeyError('Failed to fetch API key');
      } finally {
        setIsApiKeyLoading(false);
      }
    };
    fetchApiKey();
  }, []);

  const getDateLabel = () => {
    if (date?.from && date?.to) {
      return `${format(date.from, 'MMM d, yyyy')} - ${format(date.to, 'MMM d, yyyy')}`;
    }
    if (date?.from) {
      return `${format(date.from, 'MMM d, yyyy')} - ...`;
    }
    return <span className="text-muted-foreground">Pick a date range</span>;
  };

  const handleMaxStopsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/^[0-4]$/.test(value) && value !== '') {
      setMaxStopsError('Max stops must be a number from 0 to 4');
      return;
    }
    setMaxStopsError(null);
    setMaxStops(value === '' ? 0 : Number(value));
  };

  const isSearchEnabled =
    !!origin &&
    !!destination &&
    !!date?.from &&
    !!date?.to &&
    !!apiKey &&
    maxStops >= 0 &&
    maxStops <= 4 &&
    !apiKeyError &&
    !maxStopsError;

  return (
    <form className="flex flex-col gap-6 w-full max-w-screen-lg mx-auto bg-card p-4 rounded-xl border shadow">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <label htmlFor="origin" className="block text-sm font-medium text-foreground mb-1">Origin</label>
          <AirportSearch
            value={origin}
            onChange={setOrigin}
            placeholder="Search origin airport"
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <label htmlFor="destination" className="block text-sm font-medium text-foreground mb-1">Destination</label>
          <AirportSearch
            value={destination}
            onChange={setDestination}
            placeholder="Search destination airport"
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1">Date</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="justify-start text-left font-normal h-9"
              >
                {getDateLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start">
              <Calendar
                mode="range"
                selected={date}
                onSelect={(range) => {
                  setDate(range);
                  // Only close if both from and to are selected
                  if (range?.from && range?.to) setOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-end flex-1 pt-6 md:pt-0 gap-2">
          <Button type="submit" className="w-full h-9" disabled={!isSearchEnabled}>
            Search
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-label={showAdvanced ? 'Hide advanced search' : 'Show advanced search'}
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg p-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="api-key" className="block text-sm font-medium text-foreground mb-1">API Key</label>
            <Input
              id="api-key"
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              disabled={isApiKeyLoading}
              autoComplete="off"
              className="h-9"
            />
            {apiKeyError && <span className="text-xs text-red-600 mt-1">{apiKeyError}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="max-stops" className="block text-sm font-medium text-foreground mb-1">Max Stops</label>
            <Input
              id="max-stops"
              type="number"
              min={0}
              max={4}
              value={maxStops}
              onChange={handleMaxStopsChange}
              className="h-9"
              inputMode="numeric"
              pattern="[0-4]"
            />
            {maxStopsError && <span className="text-xs text-red-600 mt-1">{maxStopsError}</span>}
          </div>
        </div>
      )}
    </form>
  );
} 