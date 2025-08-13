'use client';

import { useState } from 'react';
import { PZSearch, PZResults } from '@/components/pz';
import type { PZSearchParams, PZAnalysisResults } from '@/types';

export default function UnitedPZPage() {
  const [searchParams, setSearchParams] = useState<PZSearchParams | null>(null);
  const [results, setResults] = useState<PZAnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (params: PZSearchParams) => {
    setSearchParams(params);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/pz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch PZ data');
      }

      const data = await response.json();
      setResults(data.data);
    } catch (error) {
      console.error('Error fetching PZ data:', error);
      setResults(null);
      // You might want to show a toast or error message here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center pt-8 px-4">
      <div className="flex flex-col gap-6 items-center w-full mb-8">
        <PZSearch onSearch={handleSearch} />
        <PZResults 
          results={results} 
          searchParams={searchParams}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
