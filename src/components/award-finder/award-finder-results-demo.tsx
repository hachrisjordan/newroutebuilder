"use client";

import React from "react";
import type { AwardFinderResults, Flight } from "@/types/award-finder-results";
import { AwardFinderResultsComponent } from ".";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Checkbox } from '@/components/ui/checkbox';
import { getTotalDuration, getClassPercentages } from '@/lib/utils';

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

const AwardFinderResultsDemo: React.FC = () => {
  const [results, setResults] = React.useState<AwardFinderResults | null>(null);
  const [page, setPage] = React.useState(0);
  const [sortBy, setSortBy] = React.useState<string>("duration");
  const [reliableOnly, setReliableOnly] = React.useState(false);
  const [reliability, setReliability] = React.useState<Record<string, { min_count: number }>>({});
  const [reliabilityLoading, setReliabilityLoading] = React.useState(false);

  React.useEffect(() => {
    // Remove the import statement and any related code that loads or uses it
  }, []);

  React.useEffect(() => {
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

  if (!results || (reliableOnly && reliabilityLoading)) {
    return <div className="text-muted-foreground flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></span>Loading results...</div>;
  }

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

  return (
    <div className="w-full flex flex-col items-center">
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
    </div>
  );
};

export default AwardFinderResultsDemo; 