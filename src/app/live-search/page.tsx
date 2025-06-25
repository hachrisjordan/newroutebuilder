"use client";

import { useState, useEffect } from "react";
import LiveSearchForm from "@/components/award-finder/live-search-form";
import LiveSearchResultsCards from "@/components/award-finder/live-search-results-cards";
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import React from 'react';
import LiveSearchFilters, { LiveSearchFiltersState } from '@/components/award-finder/live-search-filters';

type LiveSearchResult = {
  program: string;
  from: string;
  to: string;
  depart: string;
  data?: any;
  error?: string;
};

export default function LiveSearchPage() {
  const [results, setResults] = useState<LiveSearchResult[] | null>(null);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);

  // Reset page to 0 when results change
  useEffect(() => {
    setPage(0);
  }, [results]);

  // Find all itineraries from all results
  const allItins = results
    ? results
        .filter(r => r.data && Array.isArray(r.data.itinerary) && r.data.itinerary.length > 0)
        .flatMap(r => r.data.itinerary.map((itin: any) => ({ ...itin, __program: r.program })))
    : [];

  // --- Filter state and logic ---
  // Compute min/max for initial state
  function getPointsRange(cls: string): [number, number] {
    const pts = allItins.flatMap(i => i.bundles.filter((b: any) => b.class === cls).map((b: any) => Number(b.points)));
    if (!pts.length) return [0, 0];
    return [Math.min(...pts), Math.max(...pts)];
  }
  const yRange = getPointsRange('Y');
  const wRange = getPointsRange('W');
  const jRange = getPointsRange('J');
  const fRange = getPointsRange('F');
  const depTimes = allItins.map(i => {
    const t = i.depart.split('T')[1];
    if (!t) return 0;
    const [h, m] = t.split(':');
    return Number(h) * 60 + Number(m);
  });
  const arrTimes = allItins.map(i => {
    const t = i.arrive.split('T')[1];
    if (!t) return 0;
    const [h, m] = t.split(':');
    return Number(h) * 60 + Number(m);
  });

  // Compute min/max datetime for departure/arrival
  const depDates = allItins.map(i => new Date(i.depart)).filter(d => !isNaN(d.getTime()));
  const arrDates = allItins.map(i => new Date(i.arrive)).filter(d => !isNaN(d.getTime()));
  const depMin = depDates.length ? depDates.reduce((a, b) => a < b ? a : b).getTime() : Date.now();
  const depMax = depDates.length ? depDates.reduce((a, b) => a > b ? a : b).getTime() : Date.now();
  const arrMin = arrDates.length ? arrDates.reduce((a, b) => a < b ? a : b).getTime() : Date.now();
  const arrMax = arrDates.length ? arrDates.reduce((a, b) => a > b ? a : b).getTime() : Date.now();

  const [filterState, setFilterState] = useState<LiveSearchFiltersState>({
    dates: [],
    classes: [],
    yPoints: yRange,
    wPoints: wRange,
    jPoints: jRange,
    fPoints: fRange,
    depTime: [depMin, depMax],
    arrTime: [arrMin, arrMax],
  });

  // Update filter state if data changes
  useEffect(() => {
    setFilterState(fs => ({
      ...fs,
      yPoints: yRange,
      wPoints: wRange,
      jPoints: jRange,
      fPoints: fRange,
      depTime: [depMin, depMax],
      arrTime: [arrMin, arrMax],
    }));
  }, [results]);

  // Filtering logic
  const filteredItins = React.useMemo(() => {
    return allItins.filter(itin => {
      // Date filter
      if (filterState.dates.length && !filterState.dates.includes(itin.depart.slice(0, 10))) return false;
      // Class filter
      if (filterState.classes.length) {
        const hasClass = itin.bundles.some((b: any) => filterState.classes.includes(b.class));
        if (!hasClass) return false;
      }
      // Y/W/J/F point filters
      const classFilters = [
        { key: 'Y', range: filterState.yPoints },
        { key: 'W', range: filterState.wPoints },
        { key: 'J', range: filterState.jPoints },
        { key: 'F', range: filterState.fPoints },
      ];
      for (const { key, range } of classFilters) {
        const bundle = itin.bundles.find((b: any) => b.class === key);
        if (bundle) {
          const pts = Number(bundle.points);
          if (pts < range[0] || pts > range[1]) return false;
        }
      }
      // Departure datetime filter
      const depT = new Date(itin.depart).getTime();
      if (depT < filterState.depTime[0] || depT > filterState.depTime[1]) return false;
      // Arrival datetime filter
      const arrT = new Date(itin.arrive).getTime();
      if (arrT < filterState.arrTime[0] || arrT > filterState.arrTime[1]) return false;
      return true;
    });
  }, [allItins, filterState]);

  // Sorting logic
  const sortedItins = React.useMemo(() => {
    if (!sortBy || filteredItins.length === 0) return filteredItins;
    const itins = [...filteredItins];
    if (sortBy === 'duration') {
      itins.sort((a, b) => a.duration - b.duration);
    } else if (sortBy === 'departure') {
      itins.sort((a, b) => new Date(a.depart).getTime() - new Date(b.depart).getTime());
    } else if (sortBy === 'arrival') {
      itins.sort((a, b) => new Date(b.arrive).getTime() - new Date(a.arrive).getTime());
    } else if (['y', 'w', 'j', 'f'].includes(sortBy)) {
      // Find the price for the class, sort by lowest
      itins.sort((a, b) => {
        const aBundle = a.bundles.find((x: any) => x.class.toLowerCase() === sortBy);
        const bBundle = b.bundles.find((x: any) => x.class.toLowerCase() === sortBy);
        const aPoints = aBundle ? Number(aBundle.points) : Infinity;
        const bPoints = bBundle ? Number(bBundle.points) : Infinity;
        return aPoints - bPoints;
      });
    }
    return itins;
  }, [filteredItins, sortBy]);

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(sortedItins.length / PAGE_SIZE);
  const pagedItins = sortedItins.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const sortOptions = [
    { value: 'duration', label: 'Duration (shortest)' },
    { value: 'departure', label: 'Departure Time (earliest)' },
    { value: 'arrival', label: 'Arrival Time (latest)' },
    { value: 'y', label: 'Economy (Lowest)' },
    { value: 'w', label: 'Premium Economy (Lowest)' },
    { value: 'j', label: 'Business (Lowest)' },
    { value: 'f', label: 'First (Lowest)' },
  ];

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <LiveSearchForm onSearch={arr => arr.length === 0 ? setResults(null) : setResults(arr)} />
      {results && (
        <div className="w-full max-w-4xl mt-8">
          {allItins.length > 0 ? (
            <>
              <LiveSearchFilters
                allItins={allItins}
                filterState={filterState}
                onFilterChange={setFilterState}
              />
              <div className="flex items-center w-full justify-end gap-2 mb-4">
                <label htmlFor="sort" className="text-sm text-muted-foreground mr-2">Sort:</label>
                <Select value={sortBy} onValueChange={v => setSortBy(v === '' ? undefined : v)}>
                  <SelectTrigger className="w-56" id="sort">
                    <SelectValue placeholder="Sort..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <LiveSearchResultsCards itineraries={pagedItins} />
              <div className="flex justify-center mt-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-center py-8">No itineraries found.</div>
          )}
        </div>
      )}
    </main>
  );
} 