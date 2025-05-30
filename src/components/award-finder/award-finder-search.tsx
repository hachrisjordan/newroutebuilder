'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AirportSearch } from '@/components/airport-search';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, isValid, addYears } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { awardFinderSearchRequestSchema } from '@/lib/utils';
import type { AwardFinderResults, AwardFinderSearchRequest } from '@/types/award-finder-results';
import AwardFinderResultsComponent from '@/components/award-finder/award-finder-results-component';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { getTotalDuration, getClassPercentages } from '@/lib/utils';

interface Profile {
  id: string;
  api_key: string | null;
}

const PAGE_SIZE = 25;

const flattenItineraries = (results: AwardFinderResults) => {
  const cards: Array<{
    route: string;
    date: string;
    itinerary: string[];
  }> = [];
  Object.entries(results.itineraries).forEach(([route, dates]) => {
    Object.entries(dates).forEach(([date, itineraries]) => {
      itineraries.forEach((itinerary) => {
        cards.push({ route, date, itinerary });
      });
    });
  });
  return cards;
};

const getSortValue = (card: any, results: AwardFinderResults, sortBy: string) => {
  const flights = card.itinerary.map((id: string) => results.flights[id]);
  if (sortBy === "duration") {
    return getTotalDuration(flights);
  }
  if (sortBy === "departure") {
    return new Date(flights[0].DepartsAt).getTime();
  }
  if (sortBy === "arrival") {
    return new Date(flights[flights.length - 1].ArrivesAt).getTime();
  }
  if (["y", "w", "j", "f"].includes(sortBy)) {
    return getClassPercentages(flights)[sortBy as "y" | "w" | "j" | "f"];
  }
  return 0;
};

const sortOptions = [
  { value: "duration", label: "Duration" },
  { value: "departure", label: "Departure (earliest)" },
  { value: "arrival", label: "Arrival (latest)" },
  { value: "y", label: "Economy %" },
  { value: "w", label: "Premium Economy %" },
  { value: "j", label: "Business %" },
  { value: "f", label: "First %" },
];

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

  // New state for API interaction
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AwardFinderResults | null>(null);

  // New state for sort, reliable, pagination
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<string>('duration');
  const [reliableOnly, setReliableOnly] = useState(false);
  const [reliability, setReliability] = useState<Record<string, { min_count: number }>>({});
  const [reliabilityLoading, setReliabilityLoading] = useState(false);

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
    if (!reliableOnly) return;
    setReliabilityLoading(true);
    fetch('/api/reliability')
      .then(res => res.json())
      .then(data => {
        const map = Object.fromEntries(data.map((r: { code: string, min_count: number }) => [r.code, r]));
        setReliability(map);
      })
      .finally(() => setReliabilityLoading(false));
  }, [reliableOnly]);

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

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResults(null);
    setPage(0);
    if (!date?.from || !date?.to) {
      setError('Please select a valid date range.');
      return;
    }
    // Format dates as YYYY-MM-DD
    const startDate = format(date.from, 'yyyy-MM-dd');
    const endDate = format(date.to, 'yyyy-MM-dd');
    const requestBody: AwardFinderSearchRequest = {
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      maxStop: maxStops,
      startDate,
      endDate,
      apiKey: apiKey.trim(),
    };
    // Validate with Zod
    const parseResult = awardFinderSearchRequestSchema.safeParse(requestBody);
    if (!parseResult.success) {
      setError('Invalid input: ' + parseResult.error.errors.map(e => e.message).join(', '));
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/award-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setResults(data as AwardFinderResults);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch results');
    } finally {
      setIsLoading(false);
    }
  };

  function filterReliable(results: AwardFinderResults): AwardFinderResults {
    if (!reliableOnly || !Object.keys(reliability).length) return results;
    const filteredFlights: typeof results.flights = {};
    for (const [id, flight] of Object.entries(results.flights)) {
      const code = flight.FlightNumbers.slice(0, 2);
      const min = reliability[code]?.min_count ?? 1;
      const newFlight = { ...flight };
      if (newFlight.YCount < min) newFlight.YCount = 0;
      if (newFlight.WCount < min) newFlight.WCount = 0;
      if (newFlight.JCount < min) newFlight.JCount = 0;
      if (newFlight.FCount < min) newFlight.FCount = 0;
      if (newFlight.YCount || newFlight.WCount || newFlight.JCount || newFlight.FCount) {
        filteredFlights[id] = newFlight;
      }
    }
    const filteredItineraries: typeof results.itineraries = {};
    for (const [route, dates] of Object.entries(results.itineraries)) {
      filteredItineraries[route] = {};
      for (const [date, itineraries] of Object.entries(dates)) {
        filteredItineraries[route][date] = itineraries.filter(itin =>
          itin.every(flightId => filteredFlights[flightId])
        );
      }
    }
    return { itineraries: filteredItineraries, flights: filteredFlights };
  }

  // --- RENDER ---
  return (
    <>
      <form className="flex flex-col gap-6 w-full px-2 sm:px-4 bg-card p-4 rounded-xl border shadow" onSubmit={handleSubmit}>
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
                  fromDate={new Date()}
                  toDate={addYears(new Date(), 1)}
                  onSelect={(range, selectedDay) => {
                    // If both from and to are selected and user selects a new date, reset range
                    if (date?.from && date?.to && selectedDay) {
                      setDate({ from: selectedDay, to: undefined });
                    } else {
                      setDate(range);
                      // Only close if both from and to are selected
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg p-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="api-key" className="block text-sm font-medium text-foreground mb-1">API Key</label>
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
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </form>
      {results && (
        <div className="mt-8 w-full flex flex-col items-center">
          <div className="w-full max-w-4xl mx-auto flex flex-row items-center justify-between mb-4 gap-2">
            <label className="flex items-center gap-1 text-sm">
              <Checkbox
                id="reliableOnly"
                checked={reliableOnly}
                onCheckedChange={checked => setReliableOnly(!!checked)}
                className="mr-2"
              />
              <span>Reliable results</span>
            </label>
            <div className="flex items-center w-fit gap-2">
              <label htmlFor="sort" className="text-sm text-muted-foreground mr-2">Sort:</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-56" id="sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Results Table with Pagination */}
          {reliableOnly && reliabilityLoading ? (
            <div className="text-muted-foreground flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></span>Loading results...</div>
          ) : (
            (() => {
              const filteredResults = filterReliable(results);
              let cards = flattenItineraries(filteredResults);
              cards = cards.sort((a, b) => {
                const aVal = getSortValue(a, filteredResults, sortBy);
                const bVal = getSortValue(b, filteredResults, sortBy);
                if (["arrival", "y", "w", "j", "f"].includes(sortBy)) {
                  return bVal - aVal;
                }
                return aVal - bVal;
              });
              const totalPages = Math.ceil(cards.length / PAGE_SIZE);
              const pagedCards = cards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
              return <>
                <AwardFinderResultsComponent
                  results={{
                    itineraries: pagedCards.reduce((acc, { route, date, itinerary }) => {
                      if (!acc[route]) acc[route] = {};
                      if (!acc[route][date]) acc[route][date] = [];
                      acc[route][date].push(itinerary);
                      return acc;
                    }, {} as AwardFinderResults["itineraries"]),
                    flights: filteredResults.flights,
                  }}
                />
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>;
            })()
          )}
        </div>
      )}
    </>
  );
} 