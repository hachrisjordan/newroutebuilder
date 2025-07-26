"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AwardFinderSearch } from '@/components/award-finder/award-finder-search';
import AwardFinderResultsCard from '@/components/award-finder/award-finder-results-card';
import type { AwardFinderResults } from '@/types/award-finder-results';
import { getTotalDuration, getClassPercentages } from '@/lib/utils';

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
  
  // Additional state for AwardFinderResultsCard (different types)
  const [selectedStopsNumbers, setSelectedStopsNumbers] = useState<number[]>([]);
  const [depTimeRange, setDepTimeRange] = useState<[number, number] | null>(null);
  const [arrTimeRange, setArrTimeRange] = useState<[number, number] | null>(null);
  const [airportFilterObj, setAirportFilterObj] = useState<any>({ include: { origin: [], destination: [], connection: [] }, exclude: { origin: [], destination: [], connection: [] } });
  
  // Flag to track if filters have been initialized
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
  // Memoize objects to prevent unnecessary re-renders
  const memoizedDepTimeRange = useMemo(() => depTimeRange, [depTimeRange?.[0], depTimeRange?.[1]]);
  const memoizedArrTimeRange = useMemo(() => arrTimeRange, [arrTimeRange?.[0], arrTimeRange?.[1]]);
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
    if (memoizedDepTimeRange) {
      params.set('depTimeMin', String(memoizedDepTimeRange[0]));
      params.set('depTimeMax', String(memoizedDepTimeRange[1]));
    }
    if (memoizedArrTimeRange) {
      params.set('arrTimeMin', String(memoizedArrTimeRange[0]));
      params.set('arrTimeMax', String(memoizedArrTimeRange[1]));
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
  const handleSearch = useCallback(async (body: any, pageOverride?: number, pageSizeOverride?: number) => {
    setIsLoading(true);
    setLastSearchBody(body); // Store the last search body
    setFiltersInitialized(true); // Mark filters as initialized after first search
    const query = buildQueryParams();
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
      throw new Error('API error');
    }
    const data = await res.json();
    
    // The API now returns the data in the correct format with filterMetadata
    setResults(data);
    setTotal(data.total || 0);
    setPage(data.page || 1);
    setPageSize(data.pageSize || PAGE_SIZE);
    setResetFiltersSignal(s => s + 1);
    setIsLoading(false);
  }, [buildQueryParams, page, pageSize]);

  // When user changes sortBy or sortOrder, trigger a new search with the latest values
  useEffect(() => {
    if (lastSearchBody) {
      handleSearch(lastSearchBody, 1, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  // When user changes page
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (lastSearchBody) {
      handleSearch(lastSearchBody, newPage, pageSize);
    }
  };

  // When user changes page size
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    if (lastSearchBody) {
      handleSearch(lastSearchBody, 1, newPageSize);
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
    if (lastSearchBody) {
      setPage(1);
      handleSearch(lastSearchBody, 1, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Debounced filter effect to prevent rapid API calls
  useEffect(() => {
    if (lastSearchBody && filtersInitialized) {
      const timeoutId = setTimeout(() => {
        setPage(1);
        handleSearch(lastSearchBody, 1, pageSize);
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStopsNumbers, selectedIncludeAirlines, selectedExcludeAirlines, yPercent, wPercent, jPercent, fPercent, duration, memoizedDepTimeRange, memoizedArrTimeRange, memoizedAirportFilterObj]);

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <AwardFinderSearch
        onSearch={handleSearch}
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
          depTime={memoizedDepTimeRange || undefined}
          setDepTime={(time) => time && setDepTimeRange(time)}
          arrTime={memoizedArrTimeRange || undefined}
          setArrTime={(time) => time && setArrTimeRange(time)}
          airportFilter={memoizedAirportFilterObj}
          setAirportFilter={setAirportFilterObj}
        />
      )}
    </main>
  );
} 