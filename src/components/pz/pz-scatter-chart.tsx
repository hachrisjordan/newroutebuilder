'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, differenceInDays } from 'date-fns';
import type { PZSearchParams } from '@/types';

interface PZDetailRecord {
  departure_date: string;
  flight_number: string;
  pz: number;
  origin_airport: string;
  destination_airport: string;
}

interface PZScatterChartProps {
  isOpen: boolean;
  onClose: () => void;
  route: string;
  searchParams: PZSearchParams;
  viewMode: 'flight' | 'day';
}

/**
 * Convert date to T- format relative to today
 * Example: if today is 2025-08-13 and date is 2025-08-18, returns "T-5"
 */
const formatDateToT = (dateStr: string): string => {
  // Parse date in local timezone to avoid UTC conversion issues
  // dateStr format: YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  const today = new Date();
  
  // Reset time components for accurate day calculation
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const daysDiff = differenceInDays(date, today);
  
  if (daysDiff === 0) return 'T';
  if (daysDiff > 0) return `T-${daysDiff}`; // Future dates get negative T values
  return `T+${Math.abs(daysDiff)}`; // Past dates get positive T values
};

/**
 * Custom tooltip for the scatter plot
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
        <p className="font-medium">{`Flight: ${data.flight_number}`}</p>
        <p className="text-sm">{`Date: ${(() => {
          const [year, month, day] = data.departure_date.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          return format(date, 'MMM dd, yyyy');
        })()}`}</p>
        <p className="text-sm">{`T-Format: ${data.tFormat}`}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">{`PZ: ${data.pz}`}</p>
      </div>
    );
  }
  return null;
};

export function PZScatterChart({ isOpen, onClose, route, searchParams, viewMode }: PZScatterChartProps) {
  const [data, setData] = useState<PZDetailRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !route) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/pz/details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route,
            startDate: searchParams.startDate,
            endDate: searchParams.endDate,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch PZ details');
        }

        const result = await response.json();
        setData(result.data || []);
      } catch (err) {
        console.error('Error fetching PZ details:', err);
        setError('Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, route, searchParams.startDate, searchParams.endDate]);

  // Get unique T-formats and create a mapping for X positions
  const uniqueTFormats = [...new Set(data.map(record => formatDateToT(record.departure_date)))]
    .sort((a, b) => {
      const getNumericValue = (tFormat: string) => {
        if (tFormat === 'T') return 0;
        const num = parseInt(tFormat.substring(2));
        return tFormat.startsWith('T+') ? -num : num;
      };
      return getNumericValue(a) - getNumericValue(b);
    });

  const tFormatToXPosition = uniqueTFormats.reduce((acc, tFormat, index) => {
    acc[tFormat] = index;
    return acc;
  }, {} as Record<string, number>);

  // Process data for the chart
  const chartData = data.map(record => {
    const tFormat = formatDateToT(record.departure_date);
    return {
      ...record,
      tFormat,
      x: tFormatToXPosition[tFormat],
      y: record.pz,
    };
  });

  // Group data by day if in day mode
  const processedData = viewMode === 'day' 
    ? Object.entries(
        chartData.reduce((acc, item) => {
          const key = item.departure_date; // Group by actual date, not T-format
          if (!acc[key]) {
            acc[key] = {
              tFormat: item.tFormat,
              departure_date: item.departure_date,
              x: item.x,
              y: 0,
              count: 0,
              flights: []
            };
          }
          acc[key].y += item.pz;
          acc[key].count += 1;
          acc[key].flights.push(item.flight_number);
          return acc;
        }, {} as Record<string, any>)
      ).map(([_, group]) => ({
        ...group,
        flight_number: `${group.count} flights`,
        pz: group.y, // Sum of PZ for the day
      }))
    : chartData;

  // Data is already sorted by x position
  const sortedData = processedData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            PZ Distribution - {route} ({viewMode === 'flight' ? 'Per Flight' : 'Per Day'})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <span>Loading chart data...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              {error}
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No PZ data available for this route and date range.
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                <p>
                  Showing {sortedData.length} {viewMode === 'flight' ? 'flights' : 'days'} with PZ data
                  {viewMode === 'day' && ' (Y-axis shows sum of PZ per day)'}
                </p>
                <p className="text-xs">
                  T-Format: T = today, T+X = X days ago, T-X = X days from now
                </p>
              </div>
              
              <div style={{ width: '100%', height: '500px' }}>
                <ResponsiveContainer>
                  <ScatterChart
                    data={sortedData}
                    margin={{
                      top: 20,
                      right: 20,
                      bottom: 60,
                      left: 20,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="x"
                      type="number"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      domain={[0, uniqueTFormats.length - 1]}
                      ticks={uniqueTFormats.map((_, index) => index)}
                      tickFormatter={(value) => uniqueTFormats[value] || ''}
                    />
                    <YAxis 
                      dataKey="y"
                      type="number"
                      label={{ value: `PZ ${viewMode === 'day' ? '(Sum per Day)' : ''}`, angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter 
                      dataKey="y" 
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      stroke="#1d4ed8"
                      strokeWidth={1}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
