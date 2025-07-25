import React from 'react';
import type { AwardFinderResults } from '@/types/award-finder-results';
import AwardFinderResultsComponent from '@/components/award-finder/award-finder-results-component';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { getTotalDuration, getClassPercentages } from '@/lib/utils';
import { Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import Filters from './filters';
import type { AirportMeta, AirportFilterState } from './filters';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface AwardFinderResultsCardProps {
  results: AwardFinderResults;
  sortBy: string;
  onSortByChange: (value: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  total: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  reliableOnly: boolean;
  onReliableOnlyChange: (checked: boolean) => void;
  reliability: Record<string, { min_count: number; exemption?: string }>;
  reliabilityLoading: boolean;
  filterReliable: (results: AwardFinderResults) => AwardFinderResults;
  flattenItineraries: (results: AwardFinderResults) => Array<{ route: string; date: string; itinerary: string[] }>;
  getSortValue: (card: any, results: AwardFinderResults, sortBy: string) => number;
  PAGE_SIZE: number;
  sortOptions: { value: string; label: string }[];
  minReliabilityPercent: number;
  resetFiltersSignal?: number | string;
  isLoading?: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

// Debounce hook
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

const AwardFinderResultsCard: React.FC<AwardFinderResultsCardProps> = ({
  results,
  sortBy,
  onSortByChange,
  page,
  onPageChange,
  total,
  pageSize,
  onPageSizeChange,
  reliableOnly,
  onReliableOnlyChange,
  reliability,
  reliabilityLoading,
  filterReliable,
  flattenItineraries,
  getSortValue,
  PAGE_SIZE,
  sortOptions,
  minReliabilityPercent,
  resetFiltersSignal,
  isLoading = false,
  searchQuery,
  setSearchQuery,
}) => {
  // Remove all local sorting, search, and pagination state and handlers
  // Remove the search bar and sort dropdown from the render
  // Only render the results as received from the API, and the Pagination component to trigger API fetches

  // Helper to get unique stop counts from results
  const getStopCounts = React.useCallback(() => {
    const stopSet = new Set<number>();
    Object.keys(results.itineraries).forEach(route => {
      const stops = route.split('-').length - 2;
      stopSet.add(stops);
    });
    return Array.from(stopSet).sort((a, b) => a - b);
  }, [results]);

  // Default: all stops selected
  React.useEffect(() => {
    const allStops = getStopCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  // Airport filter state
  const [airportFilter, setAirportFilter] = React.useState<AirportFilterState>({
    include: { origin: [], destination: [], connection: [] },
    exclude: { origin: [], destination: [], connection: [] },
  });
  const handleChangeAirportFilter = (state: AirportFilterState) => {
    setAirportFilter(state);
    onPageChange(0);
  };
  const handleResetAirportFilter = () => {
    setAirportFilter({ include: { origin: [], destination: [], connection: [] }, exclude: { origin: [], destination: [], connection: [] } });
    onPageChange(0);
  };
  const [iataToCity, setIataToCity] = React.useState<Record<string, string>>({});
  const [isLoadingCities, setIsLoadingCities] = React.useState(false);
  const [cityError, setCityError] = React.useState<string | null>(null);
  // Fetch city names for all unique IATA codes in results
  React.useEffect(() => {
    const allIatas = new Set<string>();
    const cards = flattenItineraries(results);
    cards.forEach(card => {
      const segs = card.route.split('-');
      segs.forEach(iata => { if (iata) allIatas.add(iata); });
    });
    if (allIatas.size === 0) {
      setIataToCity({});
      return;
    }
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCityError(null);
      try {
        const supabase = createSupabaseBrowserClient();
        const iataList = Array.from(allIatas);
        const { data, error } = await supabase
          .from('airports')
          .select('iata, city_name')
          .in('iata', iataList);
        if (error) throw error;
        const map: Record<string, string> = {};
        data?.forEach((row: { iata: string; city_name: string }) => {
          map[row.iata] = row.city_name;
        });
        setIataToCity(map);
      } catch (err: any) {
        setCityError(err.message || 'Failed to load city names');
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, [results, flattenItineraries]);
  // Helper to extract airport meta by role from cards, using CODE - CITYNAME
  const airportMeta: AirportMeta[] = React.useMemo(() => {
    const meta: AirportMeta[] = [];
    const seen = new Set<string>();
    const cards = flattenItineraries(results);
    cards.forEach(card => {
      const segs = card.route.split('-');
      if (segs.length < 2) return;
      if (!seen.has(segs[0])) {
        meta.push({ code: segs[0], name: iataToCity[segs[0]] ? `${segs[0]} - ${iataToCity[segs[0]]}` : segs[0], role: 'origin' });
        seen.add(segs[0]);
      }
      if (!seen.has(segs[segs.length-1])) {
        meta.push({ code: segs[segs.length-1], name: iataToCity[segs[segs.length-1]] ? `${segs[segs.length-1]} - ${iataToCity[segs[segs.length-1]]}` : segs[segs.length-1], role: 'destination' });
        seen.add(segs[segs.length-1]);
      }
      for (let i = 1; i < segs.length-1; ++i) {
        if (!seen.has(segs[i])) {
          meta.push({ code: segs[i], name: iataToCity[segs[i]] ? `${segs[i]} - ${iataToCity[segs[i]]}` : segs[i], role: 'connection' });
          seen.add(segs[i]);
        }
      }
    });
    return meta;
  }, [results, flattenItineraries, iataToCity]);

  // Data processing effect
  React.useEffect(() => {
    // Bypass all client-side filtering/sorting: just use API results
    // const cards = flattenItineraries(results); // This line is removed
    // setProcessedCards(cards); // This line is removed
  }, [results, flattenItineraries]);

  React.useEffect(() => {
    // Extract unique airline codes from results.flights
    // const codes = Array.from(new Set(Object.values(results.flights).map(f => f.FlightNumbers.slice(0, 2).toUpperCase()))); // This line is removed
    // if (codes.length === 0) { // This line is removed
    //   setAirlineMeta([]); // This line is removed
    //   return; // This line is removed
    // } // This line is removed
    // // Fetch only metadata for these codes // This line is removed
    // fetch(`/api/airlines?codes=${codes.join(',')}`) // This line is removed
    //   .then(res => res.json()) // This line is removed
    //   .then(data => setAirlineMeta(Array.isArray(data) ? data : [])) // This line is removed
    //   .catch(() => setAirlineMeta([])); // This line is removed
  }, [results.flights]);

  const handleResetStops = () => {
    // setSelectedStops(getStopCounts()); // This line is removed
    onPageChange(0);
  };
  const handleResetAirlines = () => {
    // setSelectedIncludeAirlines([]); // This line is removed
    // setSelectedExcludeAirlines([]); // This line is removed
    onPageChange(0);
  };
  const handleResetY = () => {
    // setYPercent(0); // This line is removed
    onPageChange(0);
  };
  const handleResetW = () => {
    // setWPercent(0); // This line is removed
    onPageChange(0);
  };
  const handleResetJ = () => {
    // setJPercent(0); // This line is removed
    onPageChange(0);
  };
  const handleResetF = () => {
    // setFPercent(0); // This line is removed
    onPageChange(0);
  };
  const handleResetDuration = () => {
    // setDuration(maxDuration); // This line is removed
    onPageChange(0);
  };

  // Reset all filters/search when resetFiltersSignal changes
  React.useEffect(() => {
    // Reset all filter/search state to initial values
    // setSelectedIncludeAirlines([]); // This line is removed
    // setSelectedExcludeAirlines([]); // This line is removed
    // setYPercent(0); // This line is removed
    // setWPercent(0); // This line is removed
    // setJPercent(0); // This line is removed
    // setFPercent(0); // This line is removed
    // setDuration(maxDuration); // This line is removed
    // setSelectedStops(getStopCounts()); // This line is removed
    // setDepTime([depMin, depMax]); // This line is removed
    // setArrTime([arrMin, arrMax]); // This line is removed
    setAirportFilter({ include: { origin: [], destination: [], connection: [] }, exclude: { origin: [], destination: [], connection: [] } });
    // Optionally, reset other local state if needed
  }, [resetFiltersSignal, results.flights]); // Modified dependency array

  return (
    <TooltipProvider>
      <div className="mt-8 w-full flex flex-col items-center relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
            <span className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary" aria-label="Loading" />
          </div>
        )}
        {/* Filters at the very top, separated from controls */}
        <div className="w-full max-w-[1000px] mb-4 ml-auto mr-auto">
          <Filters
            stopCounts={getStopCounts()}
            selectedStops={[]} // No longer needed
            onChangeStops={() => {}} // No longer needed
            airlineMeta={[]} // No longer needed
            visibleAirlineCodes={[]} // No longer needed
            selectedIncludeAirlines={[]} // No longer needed
            selectedExcludeAirlines={[]} // No longer needed
            onChangeIncludeAirlines={() => {}} // No longer needed
            onChangeExcludeAirlines={() => {}} // No longer needed
            yPercent={0} // No longer needed
            wPercent={0} // No longer needed
            jPercent={0} // No longer needed
            fPercent={0} // No longer needed
            onYPercentChange={() => {}} // No longer needed
            onWPercentChange={() => {}} // No longer needed
            onJPercentChange={() => {}} // No longer needed
            onFPercentChange={() => {}} // No longer needed
            minDuration={0} // No longer needed
            maxDuration={1440} // No longer needed
            duration={1440} // No longer needed
            onDurationChange={() => {}} // No longer needed
            onResetStops={handleResetStops}
            onResetAirlines={handleResetAirlines}
            onResetY={handleResetY}
            onResetW={handleResetW}
            onResetJ={handleResetJ}
            onResetF={handleResetF}
            onResetDuration={handleResetDuration}
            depMin={Date.now()} // No longer needed
            depMax={Date.now() + 24*60*60*1000} // No longer needed
            depTime={[Date.now(), Date.now() + 24*60*60*1000]} // No longer needed
            arrMin={Date.now()} // No longer needed
            arrMax={Date.now() + 24*60*60*1000} // No longer needed
            arrTime={[Date.now(), Date.now() + 24*60*60*1000]} // No longer needed
            onDepTimeChange={() => {}} // No longer needed
            onArrTimeChange={() => {}} // No longer needed
            onResetDepTime={() => {}} // No longer needed
            onResetArrTime={() => {}} // No longer needed
            airportMeta={airportMeta}
            selectedAirportFilter={airportFilter}
            onChangeAirportFilter={handleChangeAirportFilter}
            onResetAirportFilter={handleResetAirportFilter}
            isLoadingCities={isLoadingCities}
            cityError={cityError}
          />
        </div>
              {/* Restore search bar and sort dropdown */}
      <div className="w-full max-w-[1000px] flex flex-col gap-1 mb-4 ml-auto mr-auto">
        <div className="flex justify-end">
          <Input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search path, date, or flight number..."
            className="w-64 md:w-72 lg:w-80 max-w-full"
            aria-label="Search results"
          />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <span className="text-sm font-medium">Sort by:</span>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-56" id="sort">
              <SelectValue placeholder="Sort by..." />
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
        {results.flights.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No results found for your search/filter criteria.</div>
        ) : (
          <AwardFinderResultsComponent
            cards={flattenItineraries(results)}
            flights={results.flights}
            reliability={reliability}
            minReliabilityPercent={minReliabilityPercent}
          />
        )}
        <Pagination
          currentPage={page - 1}
          totalPages={Math.ceil(total / pageSize)}
          onPageChange={p => onPageChange(p + 1)}
        />
        {/* API call info line */}
        {typeof results.totalSeatsAeroHttpRequests === 'number' && typeof results.minRateLimitRemaining === 'number' && typeof results.minRateLimitReset === 'number' && (
          <div className="w-full text-center text-xs text-muted-foreground mt-2 mx-auto">
            {(() => {
              const resetSec = results.minRateLimitReset || 0;
              const h = Math.floor(resetSec / 3600);
              const m = Math.floor((resetSec % 3600) / 60);
              return `seats.aero API call: ${results.totalSeatsAeroHttpRequests} (${results.minRateLimitRemaining} remaining, reset in ${h}h ${m}m)`;
            })()}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AwardFinderResultsCard; 