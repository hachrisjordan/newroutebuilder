'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { getAirlineLogoSrc } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface LoadFactorResultsProps {
  results: any;
  searchParams: {
    departureAirports: string[];
    arrivalAirports: string[];
    startMonth: string;
    endMonth: string;
    airlines: string[];
  } | null;
  isLoading: boolean;
}

export function LoadFactorResults({ results, searchParams, isLoading }: LoadFactorResultsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [airlines, setAirlines] = useState<Array<{ code: string; name: string; logo: string }>>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Load airlines on component mount
  useEffect(() => {
    const fetchAirlines = async () => {
      try {
        const response = await fetch('/api/airlines');
        const airlinesData = await response.json();
        setAirlines(airlinesData);
      } catch (error) {
        console.error('Failed to fetch airlines:', error);
      }
    };

    fetchAirlines();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full max-w-7xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-4" />
            <span className="text-lg">Loading load factor data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results || !results.data || results.data.length === 0) {
    return (
      <Card className="w-full max-w-7xl">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-lg text-muted-foreground">No load factor data found for the selected criteria.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatLoadFactor = (loadFactor: number) => {
    return `${(loadFactor * 100).toFixed(1)}%`;
  };

  const getLoadFactorColor = (loadFactor: number) => {
    if (loadFactor >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (loadFactor >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
  };

  const getAirlineName = (code: string) => {
    const airline = airlines.find(a => a.code === code);
    return airline ? airline.name : code;
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortData = (data: any[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'route':
          aValue = `${a.origin} → ${a.destination}`;
          bValue = `${b.origin} → ${b.destination}`;
          break;
        case 'airline':
          aValue = getAirlineName(a.airline);
          bValue = getAirlineName(b.airline);
          break;
        case 'passengers':
          aValue = a.passengers;
          bValue = b.passengers;
          break;
        case 'seats':
          aValue = a.seats;
          bValue = b.seats;
          break;
        case 'load_factor':
          aValue = a.load_factor;
          bValue = b.load_factor;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <Card className="w-full max-w-7xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Load Factor Results
          <Badge variant="secondary">
            {results.data.length} routes
          </Badge>
        </CardTitle>

      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => handleSort('route')}
                >
                  <div className="flex items-center gap-1">
                    Route
                    {getSortIcon('route')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => handleSort('airline')}
                >
                  <div className="flex items-center gap-1">
                    Airline
                    {getSortIcon('airline')}
                  </div>
                </TableHead>
                <TableHead 
                  className="hidden md:table-cell text-right cursor-pointer hover:bg-accent/50"
                  onClick={() => handleSort('passengers')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Passengers
                    {getSortIcon('passengers')}
                  </div>
                </TableHead>
                <TableHead 
                  className="hidden md:table-cell text-right cursor-pointer hover:bg-accent/50"
                  onClick={() => handleSort('seats')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Seats
                    {getSortIcon('seats')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-accent/50"
                  onClick={() => handleSort('load_factor')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Load Factor
                    {getSortIcon('load_factor')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortData(results.data).map((route: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium py-4">
                    {route.origin} → {route.destination}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <Image
                        src={getAirlineLogoSrc(route.airline, isDark)}
                        alt={route.airline}
                        width={20}
                        height={20}
                        className="object-contain rounded-[4px]"
                        unoptimized
                      />
                      <span className="font-medium md:hidden">{route.airline}</span>
                      <span className="font-medium hidden md:block">{getAirlineName(route.airline)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right py-4">
                    {route.passengers.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right py-4">
                    {route.seats.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getLoadFactorColor(route.load_factor)}>
                        {formatLoadFactor(route.load_factor)}
                      </Badge>
                      <span className="text-xs text-muted-foreground md:hidden">
                        {route.passengers.toLocaleString()} / {route.seats.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>


      </CardContent>
    </Card>
  );
} 