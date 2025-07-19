'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { AirportMultiSearch } from '@/components/airport-multi-search';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, isValid, addYears } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, AlertTriangle, ArrowLeftRight, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { awardFinderSearchRequestSchema } from '@/lib/utils';
import type { AwardFinderResults, AwardFinderSearchRequest } from '@/types/award-finder-results';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

// Dynamic import for heavy tooltip component
const TooltipTouch = dynamic(
  () => import('@/components/ui/tooltip-touch').then(mod => ({ default: mod.TooltipTouch })),
  { ssr: false }
);

interface AwardFinderSearchProps {
  onSearch: (results: AwardFinderResults) => void;
  minReliabilityPercent?: number;
}

// Memoized date range component
const DateRangeSelector = ({ 
  date, 
  onDateChange, 
  disabled 
}: { 
  date: DateRange | undefined; 
  onDateChange: (date: DateRange | undefined) => void;
  disabled: boolean;
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const formattedDateRange = useMemo(() => {
    if (!date?.from) return "Pick a date range";
    if (date.from && !date.to) return format(date.from, "LLL dd, y");
    if (date.from && date.to) {
      return `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`;
    }
    return "Pick a date range";
  }, [date]);

  return (
    <div className="grid gap-2">
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className="justify-start text-left font-normal"
            disabled={disabled}
          >
            {formattedDateRange}
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              onDateChange(newDate);
              if (newDate?.from && newDate?.to) {
                setIsCalendarOpen(false);
              }
            }}
            numberOfMonths={2}
            disabled={(date) => date < new Date() || date > addYears(new Date(), 1)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Memoized airport selector component
const AirportSelector = ({ 
  origins, 
  destinations, 
  onOriginsChange, 
  onDestinationsChange, 
  disabled,
  canSwap 
}: {
  origins: string[];
  destinations: string[];
  onOriginsChange: (origins: string[]) => void;
  onDestinationsChange: (destinations: string[]) => void;
  disabled: boolean;
  canSwap: boolean;
}) => {
  const handleSwap = useCallback(() => {
    if (!canSwap) return;
    const tempOrigins = [...origins];
    onOriginsChange([...destinations]);
    onDestinationsChange(tempOrigins);
  }, [origins, destinations, onOriginsChange, onDestinationsChange, canSwap]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
      <div className="space-y-2">
        <label className="text-sm font-medium">From</label>
        <AirportMultiSearch
          value={origins}
          onChange={onOriginsChange}
          placeholder="Select origin airports..."
          className={disabled ? 'opacity-50 pointer-events-none' : ''}
        />
      </div>
      
      <div className="flex justify-center md:pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleSwap}
          disabled={disabled || !canSwap}
          className="h-10 w-10"
          aria-label="Swap origins and destinations"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">To</label>
        <AirportMultiSearch
          value={destinations}
          onChange={onDestinationsChange}
          placeholder="Select destination airports..."
          className={disabled ? 'opacity-50 pointer-events-none' : ''}
        />
      </div>
    </div>
  );
};

export default function AwardFinderSearch({ onSearch, minReliabilityPercent = 85 }: AwardFinderSearchProps) {
  // State management with better initial values
  const [origins, setOrigins] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
  const [maxStop, setMaxStop] = useState<number>(1);
  const [cabin, setCabin] = useState<string>('');
  const [carriers, setCarriers] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useApiKey, setUseApiKey] = useState(false);
  
  // Memoized validation
  const canSearch = useMemo(() => {
    return origins.length > 0 && destinations.length > 0 && date?.from && date?.to && !isLoading;
  }, [origins.length, destinations.length, date?.from, date?.to, isLoading]);

  const canSwap = useMemo(() => {
    return origins.length > 0 && destinations.length > 0;
  }, [origins.length, destinations.length]);

  // Optimized search function
  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    
    setIsLoading(true);
    
    try {
      const searchRequest: AwardFinderSearchRequest = {
        origin: origins.join('/'),
        destination: destinations.join('/'),
        startDate: format(date!.from!, 'yyyy-MM-dd'),
        endDate: format(date!.to!, 'yyyy-MM-dd'),
        maxStop,
        apiKey: useApiKey ? 'user-key' : 'default-key',
      };

      // Validate request
      const validatedRequest = awardFinderSearchRequestSchema.parse(searchRequest);
      
      const supabase = createSupabaseBrowserClient();
      const response = await fetch('/api/build-itineraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedRequest),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const results: AwardFinderResults = await response.json();
      onSearch(results);
      
    } catch (error) {
      console.error('Search error:', error);
      // Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  }, [canSearch, origins, destinations, date, maxStop, cabin, carriers, useApiKey, minReliabilityPercent, onSearch]);

  return (
    <div className="space-y-6 p-6 bg-card rounded-lg border">
      <div className="space-y-4">
        <AirportSelector
          origins={origins}
          destinations={destinations}
          onOriginsChange={setOrigins}
          onDestinationsChange={setDestinations}
          disabled={isLoading}
          canSwap={canSwap}
        />
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Travel Dates</label>
          <DateRangeSelector
            date={date}
            onDateChange={setDate}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Advanced Options */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="h-auto p-2 text-sm"
        >
          Advanced Options
          {showAdvanced ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
        </Button>

        {showAdvanced && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Stops</label>
                <Select value={maxStop.toString()} onValueChange={(value) => setMaxStop(parseInt(value))}>
                  <SelectTrigger disabled={isLoading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Direct flights only</SelectItem>
                    <SelectItem value="1">Up to 1 stop</SelectItem>
                    <SelectItem value="2">Up to 2 stops</SelectItem>
                    <SelectItem value="3">Up to 3 stops</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cabin Class</label>
                <Select value={cabin} onValueChange={setCabin}>
                  <SelectTrigger disabled={isLoading}>
                    <SelectValue placeholder="Any class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any class</SelectItem>
                    <SelectItem value="Y">Economy</SelectItem>
                    <SelectItem value="W">Premium Economy</SelectItem>
                    <SelectItem value="J">Business</SelectItem>
                    <SelectItem value="F">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Airlines</label>
                <Input
                  placeholder="e.g., UA,AA,DL"
                  value={carriers}
                  onChange={(e) => setCarriers(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-api-key"
                checked={useApiKey}
                onCheckedChange={(checked) => setUseApiKey(checked === true)}
                disabled={isLoading}
              />
              <label htmlFor="use-api-key" className="text-sm">
                Use premium API key for faster results
              </label>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleSearch}
        disabled={!canSearch}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Searching...' : 'Search Award Flights'}
      </Button>

      {!canSearch && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          Please select origins, destinations, and travel dates to search.
        </div>
      )}
    </div>
  );
} 