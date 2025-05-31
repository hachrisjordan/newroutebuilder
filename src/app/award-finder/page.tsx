"use client";

import { useState, useEffect, useCallback } from 'react';
import { AwardFinderSearch } from '@/components/award-finder/award-finder-search';
import AwardFinderResultsCard from '@/components/award-finder/award-finder-results-card';
import type { AwardFinderResults } from '@/types/award-finder-results';
import { getTotalDuration, getClassPercentages } from '@/lib/utils';

const PAGE_SIZE = 10;

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

export default function AwardFinderPage() {
  const [results, setResults] = useState<AwardFinderResults | null>(null);
  const [sortBy, setSortBy] = useState<string>('duration');
  const [page, setPage] = useState(0);
  const [reliableOnly, setReliableOnly] = useState(false);
  const [reliability, setReliability] = useState<Record<string, { min_count: number }>>({});
  const [reliabilityLoading, setReliabilityLoading] = useState(false);
  const [minReliabilityPercent, setMinReliabilityPercent] = useState<number>(100);

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

  useEffect(() => {
    fetch('/api/profile').then(res => res.json()).then(data => {
      if (typeof data.min_reliability_percent === 'number') {
        setMinReliabilityPercent(data.min_reliability_percent);
      }
    });
  }, []);

  const filterReliable = useCallback((results: AwardFinderResults): AwardFinderResults => {
    if (!reliableOnly || !Object.keys(reliability).length) return results;
    // Do not mutate flight counts; keep original for display
    const filteredFlights: typeof results.flights = { ...results.flights };

    // Helper to determine if a flight is unreliable (all classes < minCount)
    const isUnreliable = (f: typeof results.flights[string]) => {
      const code = f.FlightNumbers.slice(0, 2);
      const min = reliability[code]?.min_count ?? 1;
      return (
        (f.YCount < min) &&
        (f.WCount < min) &&
        (f.JCount < min) &&
        (f.FCount < min)
      );
    };

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
    <main className="flex flex-col items-center bg-background min-h-screen pt-8 pb-12 px-2 sm:px-4">
      <AwardFinderSearch onSearch={data => {
        setResults(data);
        setPage(0);
      }} />
      {results && (
        <AwardFinderResultsCard
          results={results}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          page={page}
          onPageChange={setPage}
          reliableOnly={reliableOnly}
          onReliableOnlyChange={checked => setReliableOnly(!!checked)}
          reliability={reliability}
          reliabilityLoading={reliabilityLoading}
          filterReliable={filterReliable}
          flattenItineraries={flattenItineraries}
          getSortValue={getSortValue}
          PAGE_SIZE={PAGE_SIZE}
          sortOptions={sortOptions}
        />
      )}
    </main>
  );
} 