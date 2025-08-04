'use client';

import { useState, useEffect } from 'react';
import { LoadFactorSearch } from '@/components/load-factor/load-factor-search';
import { LoadFactorResults } from '@/components/load-factor/load-factor-results';

export default function LoadFactorPage() {
  const [searchParams, setSearchParams] = useState<{
    departureAirports: string[];
    arrivalAirports: string[];
    startMonth: string;
    endMonth: string;
    airlines: string[];
  } | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (params: {
    departureAirports: string[];
    arrivalAirports: string[];
    startMonth: string;
    endMonth: string;
    airlines: string[];
  }) => {
    setSearchParams(params);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/load-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch load factor data');
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error fetching load factor data:', error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center pt-8 px-4">
      <div className="flex flex-col gap-6 items-center w-full mb-8">
        <LoadFactorSearch onSearch={handleSearch} />
        {results && (
          <LoadFactorResults 
            results={results} 
            searchParams={searchParams}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
} 