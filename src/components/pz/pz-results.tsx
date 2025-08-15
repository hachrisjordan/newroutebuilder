'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { PZScatterChart } from './pz-scatter-chart';
import type { PZAnalysisResults, PZSearchParams } from '@/types';

interface PZResultsProps {
  results: PZAnalysisResults | null;
  searchParams: PZSearchParams | null;
  isLoading: boolean;
}

type ViewMode = 'flight' | 'day';

/**
 * Format number with appropriate decimal places
 */
const formatNumber = (value: number | null, decimals: number = 2): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(decimals);
};

/**
 * Format percentage with one decimal place
 */
const formatPercentage = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(1)}%`;
};

/**
 * Get color based on percentage value
 */
const getPercentageColor = (percentage: number): string => {
  if (percentage >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
  if (percentage >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
  if (percentage >= 40) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
};

export function PZResults({ results, searchParams, isLoading }: PZResultsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('flight');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [isChartOpen, setIsChartOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="w-full max-w-7xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-4" />
            <span className="text-lg">Analyzing {searchParams?.fareClass || 'PZ'} data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results || !searchParams) {
    return null;
  }

  if (results.routes.length === 0) {
    return (
      <Card className="w-full max-w-7xl">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-lg text-muted-foreground">No {searchParams?.fareClass || 'PZ'} data found for the selected criteria.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          aValue = a.route;
          bValue = b.route;
          break;
        case 'average':
          aValue = viewMode === 'flight' ? a.average_pz_per_flight : a.average_pz_per_day;
          bValue = viewMode === 'flight' ? b.average_pz_per_flight : b.average_pz_per_day;
          break;
        case 'median':
          aValue = viewMode === 'flight' ? a.median_pz_per_flight : a.median_pz_per_day;
          bValue = viewMode === 'flight' ? b.median_pz_per_flight : b.median_pz_per_day;
          break;
        case 'percentage':
          aValue = viewMode === 'flight' ? a.percentage_flights_with_pz : a.percentage_days_with_pz;
          bValue = viewMode === 'flight' ? b.percentage_flights_with_pz : b.percentage_days_with_pz;
          break;
        case 'total':
          aValue = viewMode === 'flight' ? a.total_flights : a.total_days;
          bValue = viewMode === 'flight' ? b.total_flights : b.total_days;
          break;
        case 'with_pz':
          aValue = viewMode === 'flight' ? a.flights_with_pz : a.days_with_pz;
          bValue = viewMode === 'flight' ? b.flights_with_pz : b.days_with_pz;
          break;
        default:
          return 0;
      }

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue === null) return sortConfig.direction === 'asc' ? -1 : 1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const handleRowClick = (route: string) => {
    setSelectedRoute(route);
    setIsChartOpen(true);
  };

  const handleCloseChart = () => {
    setIsChartOpen(false);
    setSelectedRoute(null);
  };

  return (
    <Card className="w-full max-w-7xl">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                                      <CardTitle>{searchParams?.fareClass || 'PZ'} Analysis Results</CardTitle>
              <Badge variant="secondary">
                {results.routes.length} routes
              </Badge>
            </div>
            
            {/* View Mode Switch - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">View:</span>
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === 'flight' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('flight')}
                  className="rounded-r-none"
                >
                  Per Flight
                </Button>
                <Button
                  variant={viewMode === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="rounded-l-none"
                >
                  Per Day
                </Button>
              </div>
            </div>
          </div>
          
          {/* View Mode Switch - Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-sm text-muted-foreground">View:</span>
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'flight' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('flight')}
                className="rounded-r-none"
              >
                Per Flight
              </Button>
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="rounded-l-none"
              >
                Per Day
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            💡 Click on any row to view a scatter plot of {searchParams?.fareClass || 'PZ'} distribution over time
          </p>
        </div>
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
                  className="text-right cursor-pointer hover:bg-accent/50"
                  onClick={() => handleSort('average')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Average {searchParams?.fareClass || 'PZ'}
                    {getSortIcon('average')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-accent/50"
                  onClick={() => handleSort('median')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Median {searchParams?.fareClass || 'PZ'}
                    {getSortIcon('median')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-accent/50"
                  onClick={() => handleSort('percentage')}
                >
                  <div className="flex items-center justify-end gap-1">
                    % with {searchParams?.fareClass || 'PZ'}
                    {getSortIcon('percentage')}
                  </div>
                </TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {sortData(results.routes).map((route) => (
                <TableRow 
                  key={route.route}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleRowClick(route.route)}
                >
                  <TableCell className="font-medium py-4">
                    {route.route}
                  </TableCell>
                  <TableCell className="text-right py-4">
                    {formatNumber(
                      viewMode === 'flight' ? route.average_pz_per_flight : route.average_pz_per_day
                    )}
                  </TableCell>
                  <TableCell className="text-right py-4">
                    {formatNumber(
                      viewMode === 'flight' ? route.median_pz_per_flight : route.median_pz_per_day
                    )}
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <Badge className={getPercentageColor(
                      viewMode === 'flight' ? route.percentage_flights_with_pz : route.percentage_days_with_pz
                    )}>
                      {formatPercentage(
                        viewMode === 'flight' ? route.percentage_flights_with_pz : route.percentage_days_with_pz
                      )}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Scatter Chart Modal */}
      {selectedRoute && searchParams && (
        <PZScatterChart
          isOpen={isChartOpen}
          onClose={handleCloseChart}
          route={selectedRoute}
          searchParams={searchParams}
          viewMode={viewMode}
        />
      )}
    </Card>
  );
}