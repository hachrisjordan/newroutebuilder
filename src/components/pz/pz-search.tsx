'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Loader2, CalendarIcon, X } from 'lucide-react';
import { AirportMultiSearch } from '@/components/airport-multi-search';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { PZSearchParams } from '@/types';

interface PZSearchProps {
  onSearch: (params: PZSearchParams) => void;
}

/**
 * Get formatted date label for the date range picker
 */
const getDateLabel = (date: DateRange | undefined): string => {
  if (!date?.from) {
    return 'Select date range...';
  }
  
  if (!date.to) {
    return format(date.from, 'MMM d, yyyy');
  }
  
  return `${format(date.from, 'MMM d, yyyy')} - ${format(date.to, 'MMM d, yyyy')}`;
};

export function PZSearch({ onSearch }: PZSearchProps) {
  const [departureAirports, setDepartureAirports] = useState<string[]>([]);
  const [arrivalAirports, setArrivalAirports] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
  const [fareClass, setFareClass] = useState<'IN' | 'XN' | 'PZ' | 'PN' | 'ZN' | 'RN'>('PZ');
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);

  // Set default date range: today to 330 days after today
  const today = new Date();
  const maxDate = addDays(today, 330);
  
  // Default to next 30 days if no date selected
  const defaultFromDate = today;
  const defaultToDate = addDays(today, 30);

  const handleSearch = async () => {
    if (isSearching) return;
    
    // Validate inputs
    if (departureAirports.length === 0 || arrivalAirports.length === 0) {
      alert('Please select at least one departure and arrival airport');
      return;
    }

    // Use default date range if none selected
    const searchFromDate = date?.from || defaultFromDate;
    const searchToDate = date?.to || defaultToDate;

    // Validate date range
    if (searchFromDate > searchToDate) {
      alert('Start date must be before or equal to end date');
      return;
    }

    // Check if total combinations exceed 16
    const totalCombinations = departureAirports.length * arrivalAirports.length;
    if (totalCombinations > 16) {
      alert(`Too many airport combinations (${totalCombinations}). Maximum allowed is 16.`);
      return;
    }

    setIsSearching(true);
    
    try {
      onSearch({
        departureAirports,
        arrivalAirports,
        date: { from: searchFromDate, to: searchToDate },
        fareClass,
      });
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearDateRange = () => {
    setDate(undefined);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-6">
        <form
          className="flex flex-col gap-6"
          onSubmit={e => {
            e.preventDefault();
            handleSearch();
          }}
        >


          {/* Airport Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departure-airports">Origin Airports</Label>
              <AirportMultiSearch
                value={departureAirports}
                onChange={setDepartureAirports}
                placeholder="Select origin airports..."
              />
              <p className="text-xs text-muted-foreground">
                Selected: {departureAirports.length}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="arrival-airports">Destination Airports</Label>
              <AirportMultiSearch
                value={arrivalAirports}
                onChange={setArrivalAirports}
                placeholder="Select destination airports..."
              />
              <p className="text-xs text-muted-foreground">
                Selected: {arrivalAirports.length}
              </p>
            </div>
          </div>

          {/* Date Range and Fare Class Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Date Range (Today to 330 days from today)
                </Label>
              </div>
              
              <div className="flex flex-col gap-2">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start text-left font-normal h-10"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span className="truncate">
                        {getDateLabel(date)}
                      </span>
                      {date?.from && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDate(undefined);
                          }}
                          className="ml-2 p-1 hover:bg-muted rounded transition-colors"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-auto" align="start">
                    <Calendar
                      mode="range"
                      selected={date}
                      fromDate={today}
                      toDate={maxDate}
                      onSelect={(range) => {
                        setDate(range);
                        if (range?.from && range?.to) setOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                
                <p className="text-xs text-muted-foreground">
                  {date?.from && date?.to 
                    ? `${Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} days selected`
                    : `Default: ${format(defaultFromDate, 'MMM d, yyyy')} - ${format(defaultToDate, 'MMM d, yyyy')} (30 days)`
                  }
                </p>
              </div>
            </div>

            {/* Fare Class Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Fare Class</Label>
              <Select value={fareClass} onValueChange={(value: 'IN' | 'XN' | 'PZ' | 'PN' | 'ZN' | 'RN') => setFareClass(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fare class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">IN</SelectItem>
                  <SelectItem value="XN">XN</SelectItem>
                  <SelectItem value="PZ">PZ</SelectItem>
                  <SelectItem value="PN">PN</SelectItem>
                  <SelectItem value="ZN">ZN</SelectItem>
                  <SelectItem value="RN">RN</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which fare class to analyze
              </p>
            </div>
          </div>



          {/* Search Button */}
          <div className="flex justify-center">
            <Button 
              type="submit" 
              className="min-w-[120px]"
              disabled={isSearching || departureAirports.length === 0 || arrivalAirports.length === 0}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing
                </>
              ) : (
                `Analyze ${fareClass} Data`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
