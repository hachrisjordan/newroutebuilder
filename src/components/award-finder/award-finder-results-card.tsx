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
  // Filter state and handlers
  selectedStops: number[];
  setSelectedStops: (stops: number[]) => void;
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
  depTime: [number, number] | undefined;
  setDepTime: (time: [number, number] | undefined) => void;
  arrTime: [number, number] | undefined;
  setArrTime: (time: [number, number] | undefined) => void;
  airportFilter: any;
  setAirportFilter: (filter: any) => void;
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
  // Filter state and handlers
  selectedStops,
  setSelectedStops,
  selectedIncludeAirlines,
  setSelectedIncludeAirlines,
  selectedExcludeAirlines,
  setSelectedExcludeAirlines,
  yPercent,
  setYPercent,
  wPercent,
  setWPercent,
  jPercent,
  setJPercent,
  fPercent,
  setFPercent,
  duration,
  setDuration,
  depTime,
  setDepTime,
  arrTime,
  setArrTime,
  airportFilter,
  setAirportFilter,
}) => {
  // Remove all local sorting, search, and pagination state and handlers
  // Remove the search bar and sort dropdown from the render
  // Only render the results as received from the API, and the Pagination component to trigger API fetches

  // Helper to get unique stop counts from results
  const getStopCounts = React.useCallback(() => {
    // Use filterMetadata if available, otherwise fallback to calculating from results
    if (results.filterMetadata?.stops) {
      return results.filterMetadata.stops;
    }
    const stopSet = new Set<number>();
    Object.keys(results.itineraries).forEach(route => {
      const stops = route.split('-').length - 2;
      stopSet.add(stops);
    });
    return Array.from(stopSet).sort((a, b) => a - b);
  }, [results]);

  // Initialize time ranges from filter metadata when available
  const [timeInitialized, setTimeInitialized] = React.useState(false);
  
  React.useEffect(() => {
    if (results.filterMetadata?.departure && results.filterMetadata?.arrival && !timeInitialized) {
      // Only initialize once when the component first loads
      const newDepTime: [number, number] = [results.filterMetadata.departure.min, results.filterMetadata.departure.max];
      const newArrTime: [number, number] = [results.filterMetadata.arrival.min, results.filterMetadata.arrival.max];
      
      setDepTime(newDepTime);
      setArrTime(newArrTime);
      setTimeInitialized(true);
    }
  }, [results.filterMetadata, timeInitialized, setDepTime, setArrTime]);

  // Default: all stops selected
  React.useEffect(() => {
    const allStops = getStopCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  // Airport filter handlers
  const handleChangeAirportFilter = (state: AirportFilterState) => {
    setAirportFilter(state);
    onPageChange(0);
  };
  const handleResetAirportFilter = () => {
    setAirportFilter({ include: { origin: [], destination: [], connection: [] }, exclude: { origin: [], destination: [], connection: [] } });
    onPageChange(0);
  };
  // Fetch cities for airport names
  const [iataToCity, setIataToCity] = React.useState<Record<string, string>>({});
  const [isLoadingCities, setIsLoadingCities] = React.useState(false);
  const [cityError, setCityError] = React.useState<string | null>(null);
  // Fetch airline names for the filter metadata
  const [airlineNames, setAirlineNames] = React.useState<Record<string, string>>({});
  const [isLoadingAirlineNames, setIsLoadingAirlineNames] = React.useState(false);

  // Fetch airport names from Supabase airports table
  const [airportNames, setAirportNames] = React.useState<Record<string, string>>({});
  const [isLoadingAirportNames, setIsLoadingAirportNames] = React.useState(false);

  // Helper to extract airport meta by role from cards, using IATA - CITYNAME
  const airportMeta: AirportMeta[] = React.useMemo(() => {
    const meta: AirportMeta[] = [];
    const seen = new Set<string>();
    
    // Use filterMetadata if available for better performance
    if (results.filterMetadata?.airports) {
      const { origins, destinations, connections } = results.filterMetadata.airports;
      
      origins.forEach((code: string) => {
        if (!seen.has(code)) {
          meta.push({ 
            code, 
            name: airportNames[code] ? `${code} - ${airportNames[code]}` : code, 
            role: 'origin' 
          });
          seen.add(code);
        }
      });
      
      destinations.forEach((code: string) => {
        if (!seen.has(code)) {
          meta.push({ 
            code, 
            name: airportNames[code] ? `${code} - ${airportNames[code]}` : code, 
            role: 'destination' 
          });
          seen.add(code);
        }
      });
      
      connections.forEach((code: string) => {
        if (!seen.has(code)) {
          meta.push({ 
            code, 
            name: airportNames[code] ? `${code} - ${airportNames[code]}` : code, 
            role: 'connection' 
          });
          seen.add(code);
        }
      });
      
      return meta;
    }
    
    // Fallback to calculating from results
    const cards = flattenItineraries(results);
    cards.forEach(card => {
      const segs = card.route.split('-');
      if (segs.length < 2) return;
      if (!seen.has(segs[0])) {
        meta.push({ code: segs[0], name: airportNames[segs[0]] ? `${segs[0]} - ${airportNames[segs[0]]}` : segs[0], role: 'origin' });
        seen.add(segs[0]);
      }
      if (!seen.has(segs[segs.length-1])) {
        meta.push({ code: segs[segs.length-1], name: airportNames[segs[segs.length-1]] ? `${segs[segs.length-1]} - ${airportNames[segs[segs.length-1]]}` : segs[segs.length-1], role: 'destination' });
        seen.add(segs[segs.length-1]);
      }
      for (let i = 1; i < segs.length-1; ++i) {
        if (!seen.has(segs[i])) {
          meta.push({ code: segs[i], name: airportNames[segs[i]] ? `${segs[i]} - ${airportNames[segs[i]]}` : segs[i], role: 'connection' });
          seen.add(segs[i]);
        }
      }
    });
    return meta;
  }, [results, flattenItineraries, airportNames]);

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

  // Fetch airline names for the filter metadata
  React.useEffect(() => {
    if (results.filterMetadata?.airlines && results.filterMetadata.airlines.length > 0) {
      const fetchAirlineNames = async () => {
        setIsLoadingAirlineNames(true);
        try {
                      const response = await fetch(`/api/airlines?codes=${results.filterMetadata!.airlines.join(',')}`);
          const airlines = await response.json();
          const nameMap: Record<string, string> = {};
          airlines.forEach((airline: { code: string; name: string }) => {
            nameMap[airline.code] = airline.name;
          });
          setAirlineNames(nameMap);
        } catch (error) {
          console.error('Failed to fetch airline names:', error);
        } finally {
          setIsLoadingAirlineNames(false);
        }
      };
      fetchAirlineNames();
    }
  }, [results.filterMetadata?.airlines]);

  // Fetch airport names from Supabase airports table
  React.useEffect(() => {
    if (results.filterMetadata?.airports) {
      const fetchAirportNames = async () => {
        setIsLoadingAirportNames(true);
        try {
          // Get all unique airport codes from the metadata
          const allAirports = [
            ...(results.filterMetadata!.airports.origins || []),
            ...(results.filterMetadata!.airports.destinations || []),
            ...(results.filterMetadata!.airports.connections || [])
          ];
          const uniqueAirports = [...new Set(allAirports)];
          
          if (uniqueAirports.length > 0) {
            const response = await fetch(`/api/airports?codes=${uniqueAirports.join(',')}`);
            const data = await response.json();
            const nameMap: Record<string, string> = {};
            // Handle the API response structure: { airports: [...] }
            const airports = data.airports || data;
            airports.forEach((airport: { iata: string; city_name: string }) => {
              nameMap[airport.iata] = airport.city_name;
            });
            setAirportNames(nameMap);
          }
        } catch (error) {
          console.error('Failed to fetch airport names:', error);
        } finally {
          setIsLoadingAirportNames(false);
        }
      };
      fetchAirportNames();
    }
  }, [results.filterMetadata?.airports]);

  const handleResetStops = () => {
    setSelectedStops(results.filterMetadata?.stops || []);
  };

  const handleResetAirlines = () => {
    setSelectedIncludeAirlines([]);
    setSelectedExcludeAirlines([]);
  };

  const handleResetY = () => {
    setYPercent(0);
  };

  const handleResetW = () => {
    setWPercent(0);
  };

  const handleResetJ = () => {
    setJPercent(0);
  };

  const handleResetF = () => {
    setFPercent(0);
  };

  const handleResetDuration = () => {
    setDuration(results.filterMetadata?.duration?.max || 0);
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
    // setAirportFilter({ include: { origin: [], destination: [], connection: [] }, exclude: { origin: [], destination: [], connection: [] } });
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
            stopCounts={results.filterMetadata?.stops || []}
            selectedStops={selectedStops}
            onChangeStops={setSelectedStops}
            onResetStops={handleResetStops}
            airlineMeta={results.filterMetadata?.airlines.map((code: string) => ({ 
              code, 
              name: airlineNames[code] ? `${airlineNames[code]}` : code 
            })).sort((a, b) => a.name.localeCompare(b.name)) || []}
            visibleAirlineCodes={results.filterMetadata?.airlines || []}
            selectedIncludeAirlines={selectedIncludeAirlines}
            selectedExcludeAirlines={selectedExcludeAirlines}
            onChangeIncludeAirlines={setSelectedIncludeAirlines}
            onChangeExcludeAirlines={setSelectedExcludeAirlines}
            onResetAirlines={handleResetAirlines}
            yPercent={yPercent}
            wPercent={wPercent}
            jPercent={jPercent}
            fPercent={fPercent}
            onYPercentChange={setYPercent}
            onWPercentChange={setWPercent}
            onJPercentChange={setJPercent}
            onFPercentChange={setFPercent}
            onResetY={handleResetY}
            onResetW={handleResetW}
            onResetJ={handleResetJ}
            onResetF={handleResetF}
            minDuration={results.filterMetadata?.duration?.min || 0}
            maxDuration={results.filterMetadata?.duration?.max || 0}
            duration={duration}
            onDurationChange={setDuration}
            onResetDuration={handleResetDuration}
            depMin={results.filterMetadata?.departure.min || 0}
            depMax={results.filterMetadata?.departure.max || 0}
            depTime={depTime}
            arrMin={results.filterMetadata?.arrival.min || 0}
            arrMax={results.filterMetadata?.arrival.max || 0}
            arrTime={arrTime}
            onDepTimeChange={setDepTime}
            onArrTimeChange={setArrTime}
            onResetDepTime={() => {
              const min = results.filterMetadata?.departure.min;
              const max = results.filterMetadata?.departure.max;
              if (min && max) {
                setDepTime([min, max]);
              }
            }}
            onResetArrTime={() => {
              const min = results.filterMetadata?.arrival.min;
              const max = results.filterMetadata?.arrival.max;
              if (min && max) {
                setArrTime([min, max]);
              }
            }}
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
        {Object.keys(results.flights).length === 0 ? (
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