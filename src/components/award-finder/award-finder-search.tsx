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
import { ChevronDown, ChevronUp, AlertTriangle, ArrowLeftRight, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { awardFinderSearchRequestSchema } from '@/lib/utils';
import type { AwardFinderResults, AwardFinderSearchRequest } from '@/types/award-finder-results';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TooltipTouch } from '@/components/ui/tooltip-touch';
import { ApiErrorDisplay } from '@/components/ui/api-error-display';

interface AwardFinderSearchProps {
  onSearch: (searchParams: any, isNewSearchFromForm?: boolean) => void;
  minReliabilityPercent?: number;
  selectedStops: string[];
  setSelectedStops: (stops: string[]) => void;
  selectedIncludeAirlines: string[];
  setSelectedIncludeAirlines: (airlines: string[]) => void;
  selectedExcludeAirlines: string[];
  setSelectedExcludeAirlines: (airlines: string[]) => void;
  yPercent: number;
  setYPercent: (percent: number) => void;
  wPercent: number;
  setWPercent: (percent: number) => void;
  jPercent: number;
  setJPercent: (percent: number) => void;
  fPercent: number;
  setFPercent: (percent: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  depTime: string;
  setDepTime: (time: string) => void;
  arrTime: string;
  setArrTime: (time: string) => void;
  airportFilter: string;
  setAirportFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOrder: string;
  setSortOrder: (order: 'asc' | 'desc') => void;
  airlineList: string[];
}

const SEARCH_CACHE_KEY = 'awardFinderSearchParams';

export function AwardFinderSearch({ onSearch, minReliabilityPercent, selectedStops, setSelectedStops, selectedIncludeAirlines, setSelectedIncludeAirlines, selectedExcludeAirlines, setSelectedExcludeAirlines, yPercent, setYPercent, wPercent, setWPercent, jPercent, setJPercent, fPercent, setFPercent, duration, setDuration, depTime, setDepTime, arrTime, setArrTime, airportFilter, setAirportFilter, searchQuery, setSearchQuery, sortOrder, setSortOrder, airlineList }: AwardFinderSearchProps) {
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
  const [seats, setSeats] = useState<number>(1);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const combinationCount = origin.length * destination.length;

  // Helper to get allowed max stops based on x and apiKey
  const getAllowedMaxStops = (x: number, hasApiKey: boolean) => {
    if (!hasApiKey) {
      // If API is null, only allow maxstop = 2 if origin * destination = 1, otherwise maxstop = 1
      return x === 1 ? 2 : 1;
    }
    if (x === 0) return 3;
    if (x === 1) return 3;
    if (x > 1 && x <= 5) return 2;
    if (x >= 6 && x <= 9) return 1;
    return 2; // fallback, should not happen
  };

  // Helper to get allowed max combinations based on apiKey
  const getAllowedMaxCombination = (hasApiKey: boolean) => (hasApiKey ? 9 : 3);

  // Effect: enforce maxStops and combination limits when apiKey changes
  useEffect(() => {
    const hasApiKey = !!apiKey.trim();
    // 1. Enforce maxStops
    const allowedMaxStops = getAllowedMaxStops(origin.length * destination.length, hasApiKey);
    if (maxStops > allowedMaxStops) {
      setMaxStops(allowedMaxStops);
    }
    // 2. Enforce combination limit
    const allowedMaxComb = getAllowedMaxCombination(hasApiKey);
    if (origin.length * destination.length > allowedMaxComb) {
      setOrigin([]);
      setDestination([]);
    }
    // 3. Enforce date range limit
    if (!hasApiKey && date?.from && date?.to) {
      const diff = Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 3) {
        setDate({ from: date.from, to: undefined });
      }
    }
  }, [apiKey, origin, destination, maxStops, date]);

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
        const { origin, destination, date, maxStops, seats } = JSON.parse(cached);
        if (Array.isArray(origin)) setOrigin(origin);
        if (Array.isArray(destination)) setDestination(destination);
        if (date) {
          setDate({
            from: date.from ? new Date(date.from) : undefined,
            to: date.to ? new Date(date.to) : undefined,
          });
        }
        if (typeof maxStops === 'number') setMaxStops(maxStops);
        if (typeof seats === 'number') setSeats(seats);
      } catch {}
    }
  }, []);

  useEffect(() => {
    // Cache params (except apiKey) on change
    const toCache = { origin, destination, date, maxStops, seats };
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(toCache));
    }
  }, [origin, destination, date, maxStops, seats]);

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
    maxStops >= 0 &&
    maxStops <= 3 &&
    !apiKeyError &&
    !maxStopsError &&
    combinationCount <= getAllowedMaxCombination(!!apiKey.trim());

  const allowedMaxStops = getAllowedMaxStops(combinationCount, !!apiKey.trim());
  const maxCombination = getAllowedMaxCombination(!!apiKey.trim());

  const getDateRangeDays = () => {
    if (date?.from && date?.to) {
      const diff = Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff;
    }
    return 0;
  };
  const dateRangeDays = getDateRangeDays();
  const showDateRangeWarning = dateRangeDays > 7;

  // Calendar disabled days logic for 3-day range when no API key
  const calendarDisabled = !apiKey.trim() && date?.from
    ? [
        {
          before: date.from,
          after: new Date(date.from.getTime() + 2 * 24 * 60 * 60 * 1000),
        },
      ]
    : undefined;

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
      apiKey: apiKey.trim() ? apiKey.trim() : null,
      minReliabilityPercent: typeof minReliabilityPercent === 'number' ? minReliabilityPercent : 85,
      seats,
    };
    setIsLoading(true);
    try {
      await onSearch(requestBody, true); // Pass true to indicate this is a new search from the form
    } catch (err: any) {
      setError(err.message || 'Failed to fetch results');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="w-full max-w-[1000px] mx-auto bg-card p-4 rounded-xl border shadow flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 md:flex-row md:gap-2 relative md:justify-end">
        <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
          <label htmlFor="origin" className="block text-sm font-medium text-foreground mb-1">Origin(s)</label>
          <AirportMultiSearch
            value={origin}
            onChange={setOrigin}
            placeholder="Search origin airports"
            className="h-9"
          />
        </div>
        <div className="flex items-center justify-center md:pt-8">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Swap origin and destination"
            className="rounded-full border border-input shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() => {
              setOrigin(destination);
              setDestination(origin);
            }}
          >
            <ArrowLeftRight className="h-5 w-5" />
          </Button>
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
              <TooltipTouch
                content={
                  <div className="max-w-xs">
                    <div>
                      Searching across a wide date range may result in large datasets, longer wait times, increased usage of the seats.aero API, and slower processing.
                    </div>
                    <div className="mt-2 font-medium">
                      For best results, we recommend searching within a 4–7 day range.
                    </div>
                  </div>
                }
              >
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="Wide date range warning"
                  className="ml-1 align-middle p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  style={{ touchAction: 'manipulation' }}
                >
                  <AlertTriangle className="text-yellow-500 h-4 w-4" />
                </button>
              </TooltipTouch>
            )}
            {date?.from && (
              <button
                type="button"
                aria-label="Clear date range"
                className="ml-2 p-1 rounded hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setDate(undefined)}
              >
                <X className="h-2 w-2 text-muted-foreground" />
              </button>
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
                month={currentMonth}
                fromDate={new Date()}
                toDate={addYears(new Date(), 1)}
                disabled={calendarDisabled}
                onMonthChange={setCurrentMonth}
                onSelect={(range, selectedDay) => {
                  if (!apiKey.trim() && range?.from && range?.to) {
                    const diff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    if (diff > 3) {
                      setDate({ from: range.from, to: undefined });
                      return;
                    }
                  }
                  if (date?.from && date?.to && selectedDay) {
                    setDate({ from: selectedDay, to: undefined });
                  } else {
                    setDate(range);
                    if (range?.from && range?.to) setOpen(false);
                  }
                }}
                components={{
                  Caption: ({ displayMonth }) => (
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const prevMonth = new Date(displayMonth);
                          prevMonth.setMonth(prevMonth.getMonth() - 1);
                          setCurrentMonth(prevMonth);
                        }}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <Select
                        value={`${displayMonth.getFullYear()}-${displayMonth.getMonth() + 1}`}
                        onValueChange={(value) => {
                          const [year, month] = value.split('-').map(Number);
                          const newDate = new Date(year, month - 1);
                          setCurrentMonth(newDate);
                        }}
                      >
                        <SelectTrigger className="w-fit text-m font-semibold">
                          <SelectValue>
                            {displayMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const months = [];
                            const currentDate = new Date();
                            for (let i = 0; i < 12; i++) {
                              const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i);
                              const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
                              const monthDisplayName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                              months.push({ monthKey, monthDisplayName });
                            }
                            return months.map(({ monthKey, monthDisplayName }) => (
                              <SelectItem key={monthKey} value={monthKey}>
                                {monthDisplayName}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const nextMonth = new Date(displayMonth);
                          nextMonth.setMonth(nextMonth.getMonth() + 1);
                          setCurrentMonth(nextMonth);
                        }}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
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
            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/2">
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
              <div className="flex flex-col gap-2 w-1/2">
                <label htmlFor="seats" className="block text-sm font-medium text-foreground mb-1">Seats</label>
                <Input
                  id="seats"
                  type="number"
                  min={1}
                  max={9}
                  value={seats}
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (val >= 1 && val <= 9) setSeats(val);
                  }}
                  className="h-9 w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <ApiErrorDisplay error={error} />
        </div>
      )}
      {combinationCount > maxCombination && !error && (
        <div className="text-red-600 text-sm mt-2">
          Too many combinations: Please select fewer airports.
        </div>
      )}
    </form>
  );
} 