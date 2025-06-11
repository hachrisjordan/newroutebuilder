"use client";

import { useState, useEffect } from "react";
import LiveSearchForm from "@/components/award-finder/live-search-form";
import LiveSearchResultsCards from "@/components/award-finder/live-search-results-cards";
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import React from 'react';

type LiveSearchResult = {
  program: string;
  from: string;
  to: string;
  depart: string;
  data?: any;
  error?: string;
};

const PAGE_SIZE = 10;

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

  // Sorting logic
  const sortedItins = React.useMemo(() => {
    if (!sortBy || allItins.length === 0) return allItins;
    const itins = [...allItins];
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
  }, [allItins, sortBy]);

  const totalPages = Math.ceil(sortedItins.length / PAGE_SIZE);
  const pagedItins = sortedItins.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const sortOptions = [
    { value: 'duration', label: 'Duration (shortest)' },
    { value: 'departure', label: 'Departure Time (earliest)' },
    { value: 'arrival', label: 'Arrival Time (latest)' },
    { value: 'y', label: 'Y Price (Lowest)' },
    { value: 'w', label: 'W Price (Lowest)' },
    { value: 'j', label: 'J Price (Lowest)' },
    { value: 'f', label: 'F Price (Lowest)' },
  ];

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <LiveSearchForm onSearch={arr => arr.length === 0 ? setResults(null) : setResults(arr)} />
      {results && (
        <div className="w-full max-w-4xl mt-8">
          {allItins.length > 0 ? (
            <>
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