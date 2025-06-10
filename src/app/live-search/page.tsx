"use client";

import { useState } from "react";
import LiveSearchForm from "@/components/award-finder/live-search-form";

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

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <h1 className="text-2xl font-bold mb-6">Live Award Search</h1>
      <LiveSearchForm onSearch={setResults} />
      {results && (
        <div className="w-full max-w-4xl mt-8">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 border">Program</th>
                <th className="p-2 border">From</th>
                <th className="p-2 border">To</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="even:bg-accent">
                  <td className="p-2 border">{r.program.toUpperCase()}</td>
                  <td className="p-2 border">{r.from}</td>
                  <td className="p-2 border">{r.to}</td>
                  <td className="p-2 border">{r.depart}</td>
                  <td className="p-2 border">
                    {r.error ? (
                      <span className="text-red-600">Error: {r.error}</span>
                    ) : (
                      <span className="text-green-700">Success</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
} 