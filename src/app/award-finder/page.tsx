"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AwardFinderSearch } from '@/components/award-finder/award-finder-search';
import AwardFinderResultsCard from '@/components/award-finder/award-finder-results-card';
import type { AwardFinderResults } from '@/types/award-finder-results';
import { getTotalDuration, getClassPercentages } from '@/lib/utils';
import Link from 'next/link';

const PAGE_SIZE = 10;

const flattenItineraries = (results: AwardFinderResults): Array<{ route: string; date: string; itinerary: string[] }> => {
  // New API structure: itineraries is already a flat array
  if (Array.isArray(results.itineraries)) {
    return results.itineraries as Array<{ route: string; date: string; itinerary: string[] }>;
  }
  // Old structure fallback (should not be needed anymore)
  const cards: Array<{ route: string; date: string; itinerary: string[] }> = [];
  Object.entries(results.itineraries).forEach(([route, dates]) => {
    Object.entries(dates as Record<string, string[][]>).forEach(([date, itineraries]) => {
      (itineraries as string[][]).forEach((itinerary: string[]) => {
        cards.push({ route, date, itinerary });
      });
    });
  });
  return cards;
};

const getSortValue = (card: any, results: AwardFinderResults, sortBy: string, reliability: Record<string, { min_count: number; exemption?: string }>, minReliabilityPercent: number) => {
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
    return getClassPercentages(flights, reliability, minReliabilityPercent)[sortBy as "y" | "w" | "j" | "f"];
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

export default function AwardFinderPage() {
  const [results, setResults] = useState<AwardFinderResults | null>(null);
  const [sortBy, setSortBy] = useState<string>('duration');
  const [page, setPage] = useState(1); // Start at 1 for API
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [reliableOnly, setReliableOnly] = useState(true);
  const [reliability, setReliability] = useState<Record<string, { min_count: number; exemption?: string }>>({});
  const [reliabilityLoading, setReliabilityLoading] = useState(false);
  const [minReliabilityPercent, setMinReliabilityPercent] = useState<number>(85);
  const [resetFiltersSignal, setResetFiltersSignal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuideReminder, setShowGuideReminder] = useState(true);

  // --- Advanced filter/search state ---
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [selectedIncludeAirlines, setSelectedIncludeAirlines] = useState<string[]>([]);
  const [selectedExcludeAirlines, setSelectedExcludeAirlines] = useState<string[]>([]);
  const [airlineList, setAirlineList] = useState<{ code: string; name: string }[]>([]);
  const [yPercent, setYPercent] = useState(0);
  const [wPercent, setWPercent] = useState(0);
  const [jPercent, setJPercent] = useState(0);
  const [fPercent, setFPercent] = useState(0);
  const [duration, setDuration] = useState<number>(0);
  const [depTime, setDepTime] = useState<string>('');
  const [arrTime, setArrTime] = useState<string>('');
  const [airportFilter, setAirportFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [lastSearchBody, setLastSearchBody] = useState<any>(null);
  const [seats, setSeats] = useState<number>(1); // Add seats state
  
  // Additional state for AwardFinderResultsCard (different types)
  const [selectedStopsNumbers, setSelectedStopsNumbers] = useState<number[]>([]);
  const [depTimeRange, setDepTimeRange] = useState<[number, number] | null>(null);
  const [arrTimeRange, setArrTimeRange] = useState<[number, number] | null>(null);
  const [airportFilterObj, setAirportFilterObj] = useState<any>({ include: { origin: [], destination: [], connection: [] }, exclude: { origin: [], destination: [], connection: [] } });
  
  // Flag to track if filters have been initialized
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
  // Flag to track if filters have been initialized
  const [isPerformingNewSearch, setIsPerformingNewSearch] = useState(false);
  
  // Memoize objects to prevent unnecessary re-renders
  const memoizedAirportFilterObj = useMemo(() => airportFilterObj, [
    JSON.stringify(airportFilterObj.include.origin),
    JSON.stringify(airportFilterObj.include.destination),
    JSON.stringify(airportFilterObj.include.connection),
    JSON.stringify(airportFilterObj.exclude.origin),
    JSON.stringify(airportFilterObj.exclude.destination),
    JSON.stringify(airportFilterObj.exclude.connection)
  ]);

  useEffect(() => {
    if (!reliableOnly) return;
    setReliabilityLoading(true);
    fetch('/api/reliability')
      .then(res => res.json())
      .then(data => {
        const map = Object.fromEntries(data.map((r: { code: string, min_count: number, exemption?: string }) => [r.code, r]));
        setReliability(map);
      })
      .finally(() => setReliabilityLoading(false));
  }, [reliableOnly]);

  useEffect(() => {
    fetch('/api/profile').then(res => res.json()).then(data => {
      if (typeof data.min_reliability_percent === 'number') {
        setMinReliabilityPercent(data.min_reliability_percent);
      }
    });
  }, []);

  // Check if user has dismissed the guide reminder
  useEffect(() => {
    const dismissed = localStorage.getItem('award-finder-guide-dismissed');
    if (dismissed === 'true') {
      setShowGuideReminder(false);
    }
  }, []);

  // Fetch airline list for dropdowns
  useEffect(() => {
    fetch('/api/airlines')
      .then(res => res.json())
      .then(data => setAirlineList(Array.isArray(data) ? data : []));
  }, []);

  // Handler to build query params from filter state
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedStopsNumbers.length) params.set('stops', selectedStopsNumbers.join(','));
    if (selectedIncludeAirlines.length) params.set('includeAirlines', selectedIncludeAirlines.join(','));
    if (selectedExcludeAirlines.length) params.set('excludeAirlines', selectedExcludeAirlines.join(','));
    if (yPercent > 0) params.set('minYPercent', String(yPercent));
    if (wPercent > 0) params.set('minWPercent', String(wPercent));
    if (jPercent > 0) params.set('minJPercent', String(jPercent));
    if (fPercent > 0) params.set('minFPercent', String(fPercent));
    if (duration > 0) params.set('maxDuration', String(duration));
    if (depTimeRange) {
      params.set('depTimeMin', String(depTimeRange[0]));
      params.set('depTimeMax', String(depTimeRange[1]));
    }
    if (arrTimeRange) {
      params.set('arrTimeMin', String(arrTimeRange[0]));
      params.set('arrTimeMax', String(arrTimeRange[1]));
    }
    if (memoizedAirportFilterObj.include.origin.length) params.set('includeOrigin', memoizedAirportFilterObj.include.origin.join(','));
    if (memoizedAirportFilterObj.include.destination.length) params.set('includeDestination', memoizedAirportFilterObj.include.destination.join(','));
    if (memoizedAirportFilterObj.include.connection.length) params.set('includeConnection', memoizedAirportFilterObj.include.connection.join(','));
    if (memoizedAirportFilterObj.exclude.origin.length) params.set('excludeOrigin', memoizedAirportFilterObj.exclude.origin.join(','));
    if (memoizedAirportFilterObj.exclude.destination.length) params.set('excludeDestination', memoizedAirportFilterObj.exclude.destination.join(','));
    if (memoizedAirportFilterObj.exclude.connection.length) params.set('excludeConnection', memoizedAirportFilterObj.exclude.connection.join(','));
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    return params.toString();
  };

  // Handler for search
  const handleSearch = useCallback(async (body: any, pageOverride?: number, pageSizeOverride?: number, isNewSearchFromForm: boolean = false) => {
    setIsLoading(true);
    setLastSearchBody(body); // Store the last search body
    setFiltersInitialized(true); // Mark filters as initialized after first search
    setIsPerformingNewSearch(true); // Set flag to true when a new search is initiated
    
    // For new searches from the search form, only include basic parameters, not filter parameters
    const isNewSearch = isNewSearchFromForm || !lastSearchBody || JSON.stringify(lastSearchBody) !== JSON.stringify(body);
    
    // Clear all filter states for new searches
    if (isNewSearch) {
      // Reset all filter states to their initial values
      setSelectedStopsNumbers([]);
      setSelectedIncludeAirlines([]);
      setSelectedExcludeAirlines([]);
      setYPercent(0);
      setWPercent(0);
      setJPercent(0);
      setFPercent(0);
      setDuration(0);
      setDepTimeRange(null);
      setArrTimeRange(null);
      setAirportFilterObj({ include: { origin: [], destination: [], connection: [] }, exclude: { origin: [], destination: [], connection: [] } });
      setSearchQuery('');
    }
    
    let query = '';
    if (isNewSearch) {
      // For new searches, only include sort and pagination parameters
      const params = new URLSearchParams();
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);
      query = params.toString();
    } else {
      // For filter changes, include all parameters
      query = buildQueryParams();
    }
    
    const pageParam = pageOverride ?? page;
    const pageSizeParam = pageSizeOverride ?? pageSize;
    const url = `https://api.bbairtools.com/api/build-itineraries${query ? '?' + query : ''}&page=${pageParam}&pageSize=${pageSizeParam}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setIsLoading(false);
      // Extract detailed error information from API response
      let errorMessage = 'API error';
      let errorDetails = '';
      
      try {
        const errorData = await res.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.details) {
          errorDetails = errorData.details;
        }
      } catch {
        // If we can't parse the error response, use status text
        errorMessage = res.statusText || `HTTP ${res.status}`;
      }
      
      // Create structured error object
      const apiError = {
        status: res.status,
        message: errorMessage,
        details: errorDetails || undefined,
      };
      
      throw new Error(JSON.stringify(apiError));
    }
    const data = await res.json();
    
    // The API now returns the data in the correct format with filterMetadata
    setResults(data);
    setTotal(data.total || 0);
    setPage(data.page || 1);
    setPageSize(data.pageSize || PAGE_SIZE);
    setResetFiltersSignal(s => s + 1);
    setIsLoading(false);
    setIsPerformingNewSearch(false); // Reset flag after search completes
  }, [buildQueryParams, page, pageSize, lastSearchBody, sortBy, sortOrder]);

  // When user changes sortBy or sortOrder, trigger a new search with the latest values
  useEffect(() => {
    if (lastSearchBody && !isPerformingNewSearch) {
      handleSearch(lastSearchBody, 1, pageSize, false); // Pass false to indicate this is NOT a new search from form
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  // When user changes page
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (lastSearchBody && !isPerformingNewSearch) {
      handleSearch(lastSearchBody, newPage, pageSize, false); // Pass false to indicate this is NOT a new search from form
    }
  };

  // When user changes page size
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    if (lastSearchBody && !isPerformingNewSearch) {
      handleSearch(lastSearchBody, 1, newPageSize, false); // Pass false to indicate this is NOT a new search from form
    }
  };

  // Handler for sort change
  const handleSortByChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    setPage(1);
  };
  // Handler for sort order change
  const handleSortOrderChange = (newSortOrder: 'asc' | 'desc') => {
    setSortOrder(newSortOrder);
    setPage(1);
  };

  // Handler for dismissing the guide reminder
  const handleDismissGuideReminder = () => {
    setShowGuideReminder(false);
    localStorage.setItem('award-finder-guide-dismissed', 'true');
  };

  const filterReliable = useCallback((results: AwardFinderResults): AwardFinderResults => {
    if (!reliableOnly || !Object.keys(reliability).length) return results;
    // Do not mutate flight counts; keep original for display
    const filteredFlights: typeof results.flights = { ...results.flights };

    // Helper to determine if a flight is unreliable (all classes < minCount, with exemption support)
    const isUnreliable = (f: typeof results.flights[string]) => {
      const code = f.FlightNumbers.slice(0, 2);
      const rel = reliability[code];
      const min = rel?.min_count ?? 1;
      const exemption = rel?.exemption || '';
      const minY = exemption.includes('Y') ? 1 : min;
      const minW = exemption.includes('W') ? 1 : min;
      const minJ = exemption.includes('J') ? 1 : min;
      const minF = exemption.includes('F') ? 1 : min;
      return (
        (f.YCount < minY) &&
        (f.WCount < minW) &&
        (f.JCount < minJ) &&
        (f.FCount < minF)
      );
    };

    // NEW: If itineraries is already an array (new API), filter directly
    if (Array.isArray(results.itineraries)) {
      const filteredItineraries = (results.itineraries as Array<{ route: string; date: string; itinerary: string[] }>).filter(itinObj => {
        const itin = itinObj.itinerary;
        if (!itin.every((flightId: string) => filteredFlights[flightId])) return false;
        const flights = itin.map((flightId: string) => filteredFlights[flightId]);
        const totalDuration = flights.reduce((sum: number, f: any) => sum + f.TotalDuration, 0);
        const unreliableDuration = flights
          .filter(isUnreliable)
          .reduce((sum: number, f: any) => sum + f.TotalDuration, 0);
        if (unreliableDuration === 0) return true;
        if (totalDuration === 0) return false;
        const unreliablePct = (unreliableDuration / totalDuration) * 100;
        return unreliablePct <= (100 - minReliabilityPercent);
      });
      // Return as AwardFinderResults type (array form)
      return { itineraries: filteredItineraries, flights: filteredFlights } as unknown as AwardFinderResults;
    }

    // Old structure fallback
    const filteredItineraries: typeof results.itineraries = {};
    for (const [route, dates] of Object.entries(results.itineraries)) {
      filteredItineraries[route] = {};
      for (const [date, itineraries] of Object.entries(dates as Record<string, string[][]>)) {
        filteredItineraries[route][date] = (itineraries as string[][]).filter((itin: string[]) => {
          if (!itin.every((flightId: string) => filteredFlights[flightId])) return false;
          const flights = itin.map((flightId: string) => filteredFlights[flightId]);
          const totalDuration = flights.reduce((sum: number, f: any) => sum + f.TotalDuration, 0);
          const unreliableDuration = flights
            .filter(isUnreliable)
            .reduce((sum: number, f: any) => sum + f.TotalDuration, 0);
          if (unreliableDuration === 0) return true;
          if (totalDuration === 0) return false;
          const unreliablePct = (unreliableDuration / totalDuration) * 100;
          return unreliablePct <= (100 - minReliabilityPercent);
        });
      }
    }
    return { itineraries: filteredItineraries, flights: filteredFlights };
  }, [reliableOnly, reliability, minReliabilityPercent]);

  useEffect(() => {
    if (lastSearchBody && !isPerformingNewSearch) {
      setPage(1);
      handleSearch(lastSearchBody, 1, pageSize, false); // Pass false to indicate this is NOT a new search from form
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Debounced filter effect to prevent rapid API calls
  useEffect(() => {
    if (lastSearchBody && filtersInitialized && !isPerformingNewSearch) {
      const timeoutId = setTimeout(() => {
        setPage(1);
        handleSearch(lastSearchBody, 1, pageSize, false); // Pass false to indicate this is NOT a new search from form
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStopsNumbers, selectedIncludeAirlines, selectedExcludeAirlines, yPercent, wPercent, jPercent, fPercent, duration, depTimeRange, arrTimeRange, memoizedAirportFilterObj]);

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      {/* Guide Reminder Box */}
      {showGuideReminder && (
        <div className="w-full max-w-4xl mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                🛫 New to Award Finder?
              </h3>
              <p className="text-blue-800 mb-3">
                We recommend reading our comprehensive guide to understand how to use the tool effectively and interpret the results.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/wiki/award-finder"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  📖 Read the Guide
                </Link>
                <button
                  onClick={handleDismissGuideReminder}
                  className="inline-flex items-center px-4 py-2 bg-transparent text-blue-600 text-sm font-medium border border-blue-300 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Don't show again
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissGuideReminder}
              className="ml-4 text-blue-400 hover:text-blue-600 transition-colors"
              aria-label="Close reminder"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <AwardFinderSearch
        onSearch={(body, isNewSearchFromForm) => handleSearch(body, undefined, undefined, isNewSearchFromForm)}
        minReliabilityPercent={minReliabilityPercent}
        selectedStops={selectedStops}
        setSelectedStops={setSelectedStops}
        selectedIncludeAirlines={selectedIncludeAirlines}
        setSelectedIncludeAirlines={setSelectedIncludeAirlines}
        selectedExcludeAirlines={selectedExcludeAirlines}
        setSelectedExcludeAirlines={setSelectedExcludeAirlines}
        yPercent={yPercent}
        setYPercent={setYPercent}
        wPercent={wPercent}
        setWPercent={setWPercent}
        jPercent={jPercent}
        setJPercent={setJPercent}
        fPercent={fPercent}
        setFPercent={setFPercent}
        duration={duration}
        setDuration={setDuration}
        depTime={depTime}
        setDepTime={setDepTime}
        arrTime={arrTime}
        setArrTime={setArrTime}
        airportFilter={airportFilter}
        setAirportFilter={setAirportFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={handleSortOrderChange}
        airlineList={airlineList.map(airline => airline.code)}
        onSeatsChange={setSeats}
      />
      {results && (
        <AwardFinderResultsCard
          results={results}
          sortBy={sortBy}
          onSortByChange={handleSortByChange}
          page={page}
          onPageChange={handlePageChange}
          total={total}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          reliableOnly={reliableOnly}
          onReliableOnlyChange={checked => setReliableOnly(!!checked)}
          reliability={reliability}
          reliabilityLoading={reliabilityLoading}
          filterReliable={filterReliable}
          flattenItineraries={flattenItineraries}
          getSortValue={(card, results, sortBy) => getSortValue(card, results, sortBy, reliability, minReliabilityPercent)}
          PAGE_SIZE={PAGE_SIZE}
          sortOptions={sortOptions}
          minReliabilityPercent={minReliabilityPercent}
          resetFiltersSignal={resetFiltersSignal}
          isLoading={isLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          seats={seats}
          // Filter state and handlers
          selectedStops={selectedStopsNumbers}
          setSelectedStops={setSelectedStopsNumbers}
          selectedIncludeAirlines={selectedIncludeAirlines}
          setSelectedIncludeAirlines={setSelectedIncludeAirlines}
          selectedExcludeAirlines={selectedExcludeAirlines}
          setSelectedExcludeAirlines={setSelectedExcludeAirlines}
          yPercent={yPercent}
          setYPercent={setYPercent}
          wPercent={wPercent}
          setWPercent={setWPercent}
          jPercent={jPercent}
          setJPercent={setJPercent}
          fPercent={fPercent}
          setFPercent={setFPercent}
          duration={duration}
          setDuration={setDuration}
          depTime={depTimeRange || undefined}
          setDepTime={(time) => setDepTimeRange(time || null)}
          arrTime={arrTimeRange || undefined}
          setArrTime={(time) => setArrTimeRange(time || null)}
          airportFilter={memoizedAirportFilterObj}
          setAirportFilter={setAirportFilterObj}
        />
      )}
    </main>
  );
} 