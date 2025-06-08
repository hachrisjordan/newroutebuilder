'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AirportMultiSearch } from '@/components/airport-multi-search';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, isValid, addYears } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { awardFinderSearchRequestSchema } from '@/lib/utils';
import type { AwardFinderResults, AwardFinderSearchRequest } from '@/types/award-finder-results';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface AwardFinderSearchProps {
  onSearch: (results: AwardFinderResults) => void;
}

const SEARCH_CACHE_KEY = 'awardFinderSearchParams';

export function AwardFinderSearch({ onSearch }: AwardFinderSearchProps) {
  const [origin, setOrigin] = useState<string[]>([]);
  const [destination, setDestination] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [maxStops, setMaxStops] = useState<number>(2);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [maxStopsError, setMaxStopsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxCombination = 9;
  const combinationCount = origin.length * destination.length;

  // Helper to get allowed max stops based on x
  const getAllowedMaxStops = (x: number) => {
    if (x === 0) return 4;
    if (x === 1) return 4;
    if (x > 1 && x <= 5) return 3;
    if (x >= 6 && x <= 9) return 2;
    return 2; // fallback, should not happen
  };

  useEffect(() => {
    const allowed = getAllowedMaxStops(combinationCount);
    if (maxStops > allowed) {
      setMaxStops(allowed);
    }
  }, [origin, destination]);

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

  useEffect(() => {
    // On mount, load cached params (except apiKey)
    const cached = typeof window !== 'undefined' ? localStorage.getItem(SEARCH_CACHE_KEY) : null;
    if (cached) {
      try {
        const { origin, destination, date, maxStops } = JSON.parse(cached);
        if (Array.isArray(origin)) setOrigin(origin);
        if (Array.isArray(destination)) setDestination(destination);
        if (date) {
          setDate({
            from: date.from ? new Date(date.from) : undefined,
            to: date.to ? new Date(date.to) : undefined,
          });
        }
        if (typeof maxStops === 'number') setMaxStops(maxStops);
      } catch {}
    }
  }, []);

  useEffect(() => {
    // Cache params (except apiKey) on change
    const toCache = { origin, destination, date, maxStops };
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(toCache));
    }
  }, [origin, destination, date, maxStops]);

  const getDateLabel = () => {
    if (date?.from && date?.to) {
      return `${format(date.from, 'MMM d, yyyy')} - ${format(date.to, 'MMM d, yyyy')}`;
    }
    if (date?.from) {
      return `${format(date.from, 'MMM d, yyyy')} - ...`;
    }
    return <span className="text-muted-foreground">Pick a date range</span>;
  };

  const handleMaxStopsChange = (value: string) => {
    setMaxStopsError(null);
    setMaxStops(Number(value));
  };

  const isSearchEnabled =
    origin.length > 0 &&
    destination.length > 0 &&
    !!date?.from &&
    !!date?.to &&
    !!apiKey &&
    maxStops >= 0 &&
    maxStops <= 4 &&
    !apiKeyError &&
    !maxStopsError &&
    combinationCount <= maxCombination;

  const allowedMaxStops = getAllowedMaxStops(combinationCount);

  const getDateRangeDays = () => {
    if (date?.from && date?.to) {
      const diff = Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff;
    }
    return 0;
  };
  const dateRangeDays = getDateRangeDays();
  const showDateRangeWarning = dateRangeDays > 7;

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!date?.from || !date?.to) {
      setError('Please select a valid date range.');
      return;
    }
    if (origin.length === 0 || destination.length === 0) {
      setError('Please select at least one origin and one destination airport.');
      return;
    }
    if (combinationCount > maxCombination) {
      setError('Too many combinations: Please select fewer airports.');
      return;
    }
    // Format dates as YYYY-MM-DD
    const startDate = format(date.from, 'yyyy-MM-dd');
    const endDate = format(date.to, 'yyyy-MM-dd');
    const originStr = origin.length > 1 ? origin.join('/') : origin[0];
    const destinationStr = destination.length > 1 ? destination.join('/') : destination[0];
    const requestBody = {
      origin: originStr,
      destination: destinationStr,
      maxStop: maxStops,
      startDate,
      endDate,
      apiKey: apiKey.trim(),
    };
    // Validate with Zod (will update schema next)
    // const parseResult = awardFinderSearchRequestSchema.safeParse(requestBody);
    // if (!parseResult.success) {
    //   setError('Invalid input: ' + parseResult.error.errors.map(e => e.message).join(', '));
    //   return;
    // }
    setIsLoading(true);
    try {
      const res = await fetch('https://api.bbairtools.com:8080/api/build-itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      onSearch(data as AwardFinderResults);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch results');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="w-full max-w-[1000px] mx-auto bg-card p-4 rounded-xl border shadow flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 md:flex-row md:gap-6 relative md:justify-end">
        <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
          <label htmlFor="origin" className="block text-sm font-medium text-foreground mb-1">Origin(s)</label>
          <AirportMultiSearch
            value={origin}
            onChange={setOrigin}
            placeholder="Search origin airports"
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
          <label htmlFor="destination" className="block text-sm font-medium text-foreground mb-1">Destination(s)</label>
          <AirportMultiSearch
            value={destination}
            onChange={setDestination}
            placeholder="Search destination airports"
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
            Date
            {showDateRangeWarning && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      tabIndex={0}
                      aria-label="Wide date range warning"
                      className="ml-1 align-middle p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <AlertTriangle className="text-yellow-500 h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div>
                      Searching across a wide date range may result in large datasets, longer wait times, increased usage of the seats.aero API, and slower processing.
                    </div>
                    <div className="mt-2 font-medium">
                      For best results, we recommend searching within a 4–7 day range.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </label>
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
                fromDate={new Date()}
                toDate={addYears(new Date(), 1)}
                onSelect={(range, selectedDay) => {
                  if (date?.from && date?.to && selectedDay) {
                    setDate({ from: selectedDay, to: undefined });
                  } else {
                    setDate(range);
                    if (range?.from && range?.to) setOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-end flex-1 pt-6 md:pt-0 gap-2">
          <Button type="submit" className="w-full h-9" disabled={!isSearchEnabled || isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></span>Searching...</span>
            ) : 'Search'}
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
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg p-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="api-key" className="block text-sm font-medium text-foreground mb-1">seats.aero API Key</label>
            <Input
              id="api-key"
              type="password"
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
            <Select value={String(maxStops)} onValueChange={handleMaxStopsChange}>
              <SelectTrigger id="max-stops" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: allowedMaxStops + 1 }, (_, n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {maxStopsError && <span className="text-xs text-red-600 mt-1">{maxStopsError}</span>}
          </div>
        </div>
      )}
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      {combinationCount > maxCombination && !error && (
        <div className="text-red-600 text-sm mt-2">
          Too many combinations: Please select fewer airports.
        </div>
      )}
    </form>
  );
} 