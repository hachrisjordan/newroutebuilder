"use client";

import { useState, useEffect, useCallback } from 'react';
import { AwardFinderSearch } from '@/components/award-finder/award-finder-search';
import AwardFinderResultsCard from '@/components/award-finder/award-finder-results-card';
import type { AwardFinderResults } from '@/types/award-finder-results';
import { getTotalDuration, getClassPercentages } from '@/lib/utils';

const PAGE_SIZE = 10;

const flattenItineraries = (results: AwardFinderResults) => {
  // If already flat array (new API), just return it
  if (Array.isArray(results.itineraries)) {
    return results.itineraries;
  }
  // Old structure fallback
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
  const [selectedStops, setSelectedStops] = useState<number[]>([]);
  const [selectedIncludeAirlines, setSelectedIncludeAirlines] = useState<string[]>([]);
  const [selectedExcludeAirlines, setSelectedExcludeAirlines] = useState<string[]>([]);
  const [airlineList, setAirlineList] = useState<{ code: string; name: string }[]>([]);
  const [yPercent, setYPercent] = useState(0);
  const [wPercent, setWPercent] = useState(0);
  const [jPercent, setJPercent] = useState(0);
  const [fPercent, setFPercent] = useState(0);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [depTime, setDepTime] = useState<[number, number] | undefined>(undefined);
  const [arrTime, setArrTime] = useState<[number, number] | undefined>(undefined);
  const [airportFilter, setAirportFilter] = useState<any>({ include: { origin: [], destination: [], connection: [] }, exclude: { origin: [], destination: [], connection: [] } });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [lastSearchBody, setLastSearchBody] = useState<any>(null);

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
    if (selectedStops.length) params.set('stops', selectedStops.join(','));
    if (selectedIncludeAirlines.length) params.set('includeAirlines', selectedIncludeAirlines.join(','));
    if (selectedExcludeAirlines.length) params.set('excludeAirlines', selectedExcludeAirlines.join(','));
    if (yPercent > 0) params.set('minYPercent', String(yPercent));
    if (wPercent > 0) params.set('minWPercent', String(wPercent));
    if (jPercent > 0) params.set('minJPercent', String(jPercent));
    if (fPercent > 0) params.set('minFPercent', String(fPercent));
    if (typeof duration === 'number') params.set('maxDuration', String(duration));
    if (depTime) { params.set('depTimeMin', String(depTime[0])); params.set('depTimeMax', String(depTime[1])); }
    if (arrTime) { params.set('arrTimeMin', String(arrTime[0])); params.set('arrTimeMax', String(arrTime[1])); }
    if (airportFilter.include.origin.length) params.set('includeOrigin', airportFilter.include.origin.join(','));
    if (airportFilter.include.destination.length) params.set('includeDestination', airportFilter.include.destination.join(','));
    if (airportFilter.include.connection.length) params.set('includeConnection', airportFilter.include.connection.join(','));
    if (airportFilter.exclude.origin.length) params.set('excludeOrigin', airportFilter.exclude.origin.join(','));
    if (airportFilter.exclude.destination.length) params.set('excludeDestination', airportFilter.exclude.destination.join(','));
    if (airportFilter.exclude.connection.length) params.set('excludeConnection', airportFilter.exclude.connection.join(','));
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    return params.toString();
  };

  // Handler for search
  const handleSearch = useCallback(async (body: any, pageOverride?: number, pageSizeOverride?: number) => {
    setIsLoading(true);
    setLastSearchBody(body); // Store the last search body
    const query = buildQueryParams();
    const pageParam = pageOverride ?? page;
    const pageSizeParam = pageSizeOverride ?? pageSize;
    const url = `http://localhost:3000/api/build-itineraries${query ? '?' + query : ''}&page=${pageParam}&pageSize=${pageSizeParam}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    setResults(data);
    setTotal(data.total || 0);
    setPage(data.page || 1);
    setPageSize(data.pageSize || PAGE_SIZE);
    setResetFiltersSignal(s => s + 1);
    setIsLoading(false);
  }, [buildQueryParams, page, pageSize]);

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
      const filteredItineraries = results.itineraries.filter(itinObj => {
        const itin = itinObj.itinerary;
        if (!itin.every(flightId => filteredFlights[flightId])) return false;
        const flights = itin.map(flightId => filteredFlights[flightId]);
        const totalDuration = flights.reduce((sum, f) => sum + f.TotalDuration, 0);
        const unreliableDuration = flights
          .filter(isUnreliable)
          .reduce((sum, f) => sum + f.TotalDuration, 0);
        if (unreliableDuration === 0) return true;
        if (totalDuration === 0) return false;
        const unreliablePct = (unreliableDuration / totalDuration) * 100;
        return unreliablePct <= (100 - minReliabilityPercent);
      });
      return { itineraries: filteredItineraries, flights: filteredFlights };
    }

    // Old structure fallback
    const filteredItineraries: typeof results.itineraries = {};
    for (const [route, dates] of Object.entries(results.itineraries)) {
      filteredItineraries[route] = {};
      for (const [date, itineraries] of Object.entries(dates)) {
        filteredItineraries[route][date] = itineraries.filter(itin => {
          if (!itin.every(flightId => filteredFlights[flightId])) return false;
          const flights = itin.map(flightId => filteredFlights[flightId]);
          const totalDuration = flights.reduce((sum, f) => sum + f.TotalDuration, 0);
          const unreliableDuration = flights
            .filter(isUnreliable)
            .reduce((sum, f) => sum + f.TotalDuration, 0);
          if (unreliableDuration === 0) return true;
          if (totalDuration === 0) return false;
          const unreliablePct = (unreliableDuration / totalDuration) * 100;
          return unreliablePct <= (100 - minReliabilityPercent);
        });
      }
    }
    return { itineraries: filteredItineraries, flights: filteredFlights };
  }, [reliableOnly, reliability, minReliabilityPercent]);

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
        setSortOrder={setSortOrder}
        airlineList={airlineList}
      />
      {results && (
        <AwardFinderResultsCard
          results={results}
          sortBy={sortBy}
          onSortByChange={setSortBy}
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
        />
      )}
    </main>
  );
} 