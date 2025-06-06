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

interface AwardFinderResultsCardProps {
  results: AwardFinderResults;
  sortBy: string;
  onSortByChange: (value: string) => void;
  page: number;
  onPageChange: (page: number) => void;
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
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [processedCards, setProcessedCards] = React.useState<Array<{ route: string; date: string; itinerary: string[] }>>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const [selectedStops, setSelectedStops] = React.useState<number[]>([]);
  const [selectedIncludeAirlines, setSelectedIncludeAirlines] = React.useState<string[]>([]);
  const [selectedExcludeAirlines, setSelectedExcludeAirlines] = React.useState<string[]>([]);
  const [airlineMeta, setAirlineMeta] = React.useState<{ code: string; name: string }[]>([]);
  const visibleAirlineCodes = React.useMemo(() => Array.from(new Set(Object.values(results.flights).map(f => f.FlightNumbers.slice(0, 2).toUpperCase()))), [results.flights]);
  const [yPercent, setYPercent] = React.useState(0);
  const [wPercent, setWPercent] = React.useState(0);
  const [jPercent, setJPercent] = React.useState(0);
  const [fPercent, setFPercent] = React.useState(0);
  // Duration filter state
  const allDurations = React.useMemo(() => {
    const cards = flattenItineraries(results);
    return cards.map(card => {
      const flightsArr = card.itinerary.map(fid => results.flights[fid]).filter(Boolean);
      return getTotalDuration(flightsArr);
    }).filter(Boolean);
  }, [results, flattenItineraries]);
  const minDuration = allDurations.length ? Math.min(...allDurations) : 0;
  const maxDuration = allDurations.length ? Math.max(...allDurations) : 1440;
  const [duration, setDuration] = React.useState(maxDuration);
  // Keep duration in sync with maxDuration
  React.useEffect(() => {
    setDuration(maxDuration);
  }, [maxDuration]);

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
    setSelectedStops(allStops);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  // Data processing effect
  React.useEffect(() => {
    let cancelled = false;
    setIsProcessing(true);
    setTimeout(() => {
      let filteredResults = reliableOnly ? filterReliable(results) : results;
      let cards = flattenItineraries(filteredResults);
      // Filter by number of stops if selected
      if (selectedStops.length > 0) {
        cards = cards.filter(card => selectedStops.includes(card.route.split('-').length - 2));
      }
      // Filter by airlines (include/exclude)
      if (selectedIncludeAirlines.length > 0) {
        cards = cards.filter(card => {
          // Get all airline codes in this itinerary
          const airlineCodes = card.itinerary.map(fid => filteredResults.flights[fid]?.FlightNumbers.slice(0, 2).toUpperCase());
          // Include if any segment matches any selected include airline
          return airlineCodes.some(code => selectedIncludeAirlines.includes(code));
        });
      }
      if (selectedExcludeAirlines.length > 0) {
        cards = cards.filter(card => {
          const airlineCodes = card.itinerary.map(fid => filteredResults.flights[fid]?.FlightNumbers.slice(0, 2).toUpperCase());
          // Exclude if any segment matches any selected exclude airline
          return !airlineCodes.some(code => selectedExcludeAirlines.includes(code));
        });
      }
      // Filter by duration
      if (duration < maxDuration) {
        cards = cards.filter(card => {
          const flightsArr = card.itinerary.map(fid => filteredResults.flights[fid]).filter(Boolean);
          const total = getTotalDuration(flightsArr);
          return total <= duration;
        });
      }
      // Filter by Y, W, J, F percent
      if (yPercent > 0 || wPercent > 0 || jPercent > 0 || fPercent > 0) {
        cards = cards.filter(card => {
          const flightsArr = card.itinerary.map(fid => filteredResults.flights[fid]).filter(Boolean);
          if (flightsArr.length === 0) return false;
          const { y, w, j, f } = getClassPercentages(flightsArr, reliability, minReliabilityPercent);
          return (
            y >= yPercent &&
            w >= wPercent &&
            j >= jPercent &&
            f >= fPercent
          );
        });
      }
      const query = debouncedSearchQuery.trim().toLowerCase();
      if (query) {
        cards = cards.filter(card => {
          if (card.route.toLowerCase().includes(query) || card.date.toLowerCase().includes(query)) {
            return true;
          }
          return card.itinerary.some(fid => {
            const flight = filteredResults.flights[fid];
            return flight && flight.FlightNumbers.toLowerCase().includes(query);
          });
        });
      }
      cards = cards.sort((a, b) => {
        const aVal = getSortValue(a, filteredResults, sortBy);
        const bVal = getSortValue(b, filteredResults, sortBy);
        if (aVal !== bVal) {
          if (["arrival", "y", "w", "j", "f"].includes(sortBy)) {
            return bVal - aVal;
          }
          return aVal - bVal;
        }
        const aFlights = a.itinerary.map(fid => filteredResults.flights[fid]).filter(Boolean);
        const bFlights = b.itinerary.map(fid => filteredResults.flights[fid]).filter(Boolean);
        const aDur = getTotalDuration(aFlights);
        const bDur = getTotalDuration(bFlights);
        return aDur - bDur;
      });
      const total = Math.ceil(cards.length / PAGE_SIZE);
      const pagedCards = cards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
      if (!cancelled) {
        setProcessedCards(pagedCards);
        setTotalPages(total);
        setIsProcessing(false);
      }
    }, 0);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, sortBy, page, reliableOnly, debouncedSearchQuery, filterReliable, flattenItineraries, getSortValue, PAGE_SIZE, selectedStops, selectedIncludeAirlines, selectedExcludeAirlines, yPercent, wPercent, jPercent, fPercent, duration]);

  React.useEffect(() => {
    // Extract unique airline codes from results.flights
    const codes = Array.from(new Set(Object.values(results.flights).map(f => f.FlightNumbers.slice(0, 2).toUpperCase())));
    if (codes.length === 0) {
      setAirlineMeta([]);
      return;
    }
    // Fetch only metadata for these codes
    fetch(`/api/airlines?codes=${codes.join(',')}`)
      .then(res => res.json())
      .then(data => setAirlineMeta(Array.isArray(data) ? data : []))
      .catch(() => setAirlineMeta([]));
  }, [results.flights]);

  const handleResetStops = () => setSelectedStops(getStopCounts());
  const handleResetAirlines = () => {
    setSelectedIncludeAirlines([]);
    setSelectedExcludeAirlines([]);
  };
  const handleResetY = () => setYPercent(0);
  const handleResetW = () => setWPercent(0);
  const handleResetJ = () => setJPercent(0);
  const handleResetF = () => setFPercent(0);
  const handleResetDuration = () => setDuration(maxDuration);

  return (
    <TooltipProvider>
      <div className="mt-8 w-full flex flex-col items-center">
        {/* Filters at the very top, separated from controls */}
        <div className="w-full max-w-[1000px] mb-4 ml-auto mr-auto">
          <Filters
            stopCounts={getStopCounts()}
            selectedStops={selectedStops}
            onChangeStops={setSelectedStops}
            airlineMeta={airlineMeta || []}
            visibleAirlineCodes={visibleAirlineCodes}
            selectedIncludeAirlines={selectedIncludeAirlines}
            selectedExcludeAirlines={selectedExcludeAirlines}
            onChangeIncludeAirlines={setSelectedIncludeAirlines}
            onChangeExcludeAirlines={setSelectedExcludeAirlines}
            yPercent={yPercent}
            wPercent={wPercent}
            jPercent={jPercent}
            fPercent={fPercent}
            onYPercentChange={setYPercent}
            onWPercentChange={setWPercent}
            onJPercentChange={setJPercent}
            onFPercentChange={setFPercent}
            minDuration={minDuration}
            maxDuration={maxDuration}
            duration={duration}
            onDurationChange={setDuration}
            onResetStops={handleResetStops}
            onResetAirlines={handleResetAirlines}
            onResetY={handleResetY}
            onResetW={handleResetW}
            onResetJ={handleResetJ}
            onResetF={handleResetF}
            onResetDuration={handleResetDuration}
          />
        </div>
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 mb-4">
          <div className="flex flex-row items-center justify-between gap-2 w-full">
            <label className="flex items-center gap-1 text-sm">
              <Checkbox
                id="reliableOnly"
                checked={reliableOnly}
                onCheckedChange={onReliableOnlyChange}
                className="mr-2"
              />
              <span>Reliable results</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 cursor-pointer text-muted-foreground"><Info className="w-4 h-4" /></span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Only shows itineraries with reliable award space, filtering out most flights with likely dynamic pricing that may not be bookable via partner programs.<br />
                  <br />
                  You can allow a certain maximum % of unreliable flight time in User → Settings (recommended for cash positioning flights).
                </TooltipContent>
              </Tooltip>
            </label>
            <div className="flex flex-1 justify-end items-center gap-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search path, date, or flight number..."
                className="w-64 md:w-72 lg:w-80 max-w-full ml-auto"
                aria-label="Search results"
              />
            </div>
          </div>
          <div className="flex items-center w-full justify-end gap-2">
            <label htmlFor="sort" className="text-sm text-muted-foreground mr-2">Sort:</label>
            <Select value={sortBy} onValueChange={onSortByChange}>
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
        ) : isProcessing ? (
          <div className="text-muted-foreground flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></span>Processing results...</div>
        ) : (
          <>
            <AwardFinderResultsComponent
              cards={processedCards}
              flights={(reliableOnly ? filterReliable(results) : results).flights}
              reliability={reliability}
              minReliabilityPercent={minReliabilityPercent}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
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
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AwardFinderResultsCard; 