"use client";

import React from "react";
import type { AwardFinderResults, Flight } from "@/types/award-finder-results";
import { AwardFinderResultsComponent } from ".";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";

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

// Copy of getClassPercentages from results component
const getClassPercentages = (flights: Flight[]) => {
  const totalDuration = flights.reduce((sum, f) => sum + f.TotalDuration, 0);
  const y = flights.every(f => f.YCount > 0) ? 100 : 0;
  const hasHigher = (classKey: 'WCount' | 'JCount' | 'FCount', higherKeys: string[]) =>
    flights.some(f => higherKeys.some(hk => (f as any)[hk] > 0));
  let w = 0;
  if (
    flights.some(f => f.WCount > 0) &&
    !hasHigher('WCount', ['JCount', 'FCount'])
  ) {
    const wDuration = flights.filter(f => f.WCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    w = Math.round((wDuration / totalDuration) * 100);
  }
  let j = 0;
  if (
    flights.some(f => f.JCount > 0) &&
    !hasHigher('JCount', ['FCount'])
  ) {
    const jDuration = flights.filter(f => f.JCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    j = Math.round((jDuration / totalDuration) * 100);
  }
  let f = 0;
  if (flights.some(f => f.FCount > 0)) {
    const fDuration = flights.filter(f => f.FCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    f = Math.round((fDuration / totalDuration) * 100);
  }
  return { y, w, j, f };
};

const getSortValue = (card: any, results: AwardFinderResults, sortBy: string) => {
  const flights = card.itinerary.map((id: string) => results.flights[id]);
  if (sortBy === "duration") {
    let total = 0;
    for (let i = 0; i < flights.length; i++) {
      total += flights[i].TotalDuration;
      if (i > 0) {
        const prevArrive = new Date(flights[i - 1].ArrivesAt).getTime();
        const currDepart = new Date(flights[i].DepartsAt).getTime();
        const layover = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
        total += layover;
      }
    }
    return total;
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
  { value: "departure", label: "Departure Time (earliest)" },
  { value: "arrival", label: "Arrival Time (latest)" },
  { value: "y", label: "Economy %" },
  { value: "w", label: "Premium Economy %" },
  { value: "j", label: "Business %" },
  { value: "f", label: "First %" },
];

const AwardFinderResultsDemo: React.FC = () => {
  const [results, setResults] = React.useState<AwardFinderResults | null>(null);
  const [page, setPage] = React.useState(0);
  const [sortBy, setSortBy] = React.useState<string>("duration");

  React.useEffect(() => {
    import("../../../example.json").then((mod) => setResults(mod as AwardFinderResults));
  }, []);

  if (!results) {
    return <div className="text-muted-foreground">Loading results...</div>;
  }

  let cards = flattenItineraries(results);
  cards = cards.sort((a, b) => {
    const aVal = getSortValue(a, results, sortBy);
    const bVal = getSortValue(b, results, sortBy);
    if (["arrival", "y", "w", "j", "f"].includes(sortBy)) {
      // Descending for arrival/latest and class %
      return bVal - aVal;
    }
    // Ascending for duration, departure
    return aVal - bVal;
  });

  const totalPages = Math.ceil(cards.length / PAGE_SIZE);
  const pagedCards = cards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto flex flex-row items-center justify-end mb-4 gap-2">
        <label htmlFor="sort" className="text-sm text-muted-foreground mr-2">Sort by:</label>
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
      <AwardFinderResultsComponent
        results={{
          itineraries: pagedCards.reduce((acc, { route, date, itinerary }) => {
            if (!acc[route]) acc[route] = {};
            if (!acc[route][date]) acc[route][date] = [];
            acc[route][date].push(itinerary);
            return acc;
          }, {} as AwardFinderResults["itineraries"]),
          flights: results.flights,
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