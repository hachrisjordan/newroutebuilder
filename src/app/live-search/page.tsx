"use client";

import { useState } from "react";
import LiveSearchForm from "@/components/award-finder/live-search-form";
import LiveSearchResultsCards from "@/components/award-finder/live-search-results-cards";

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

  // Find the first successful result with itineraries
  const firstItins = results?.find(r => r.data && Array.isArray(r.data.itinerary) && r.data.itinerary.length > 0)?.data?.itinerary ?? [];

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <h1 className="text-2xl font-bold mb-6">Live Award Search</h1>
      <LiveSearchForm onSearch={setResults} />
      {results && (
        <div className="w-full max-w-4xl mt-8">
          {firstItins.length > 0 ? (
            <LiveSearchResultsCards itineraries={firstItins} />
          ) : (
            <div className="text-muted-foreground text-center py-8">No itineraries found.</div>
          )}
        </div>
      )}
    </main>
  );
} 