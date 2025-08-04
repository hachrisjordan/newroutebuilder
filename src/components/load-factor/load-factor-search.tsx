'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AirportMultiSearch } from '@/components/airport-multi-search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { getAirlineLogoSrc } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface Airline {
  code: string;
  name: string;
  logo: string;
}

interface LoadFactorSearchProps {
  onSearch: (params: {
    departureAirports: string[];
    arrivalAirports: string[];
    startMonth: string;
    endMonth: string;
    airlines: string[];
  }) => void;
}

// Remove the hardcoded airline list - we'll get airlines dynamically from the database

// Generate year options from 2010 to 2025
const generateYearOptions = () => {
  const options = [];
  for (let year = 2010; year <= 2025; year++) {
    options.push({ label: year.toString(), value: year });
  }
  return options;
};

// Generate month options
const generateMonthOptions = () => {
  const months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 },
  ];
  return months;
};

const yearOptions = generateYearOptions();
const monthOptions = generateMonthOptions();

export function LoadFactorSearch({ onSearch }: LoadFactorSearchProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [departureAirports, setDepartureAirports] = useState<string[]>([]);
  const [arrivalAirports, setArrivalAirports] = useState<string[]>([]);
  const [startYear, setStartYear] = useState<number | null>(2018);
  const [startMonth, setStartMonth] = useState<number | null>(1);
  const [endYear, setEndYear] = useState<number | null>(2018);
  const [endMonth, setEndMonth] = useState<number | null>(12);

  // Smart date validation - ensure end date is not before start date
  const validateEndDate = (newEndYear: number, newEndMonth: number) => {
    if (!startYear || !startMonth) return true; // Allow if start date not set
    const startDate = new Date(startYear, startMonth - 1);
    const endDate = new Date(newEndYear, newEndMonth - 1);
    return endDate >= startDate;
  };

  const validateStartDate = (newStartYear: number, newStartMonth: number) => {
    if (!endYear || !endMonth) return true; // Allow if end date not set
    const startDate = new Date(newStartYear, newStartMonth - 1);
    const endDate = new Date(endYear, endMonth - 1);
    return startDate <= endDate;
  };
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [availableAirlines, setAvailableAirlines] = useState<string[]>([]);
  const [isLoadingAirlines, setIsLoadingAirlines] = useState(false);

  // Load airlines on component mount
  useEffect(() => {
    const fetchAirlines = async () => {
      try {
        const response = await fetch('/api/airlines');
        const airlinesData = await response.json();
        setAirlines(airlinesData);
      } catch (error) {
        console.error('Failed to fetch airlines:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAirlines();
  }, []);

  // Fetch available airlines when both airports are filled
  useEffect(() => {
    const fetchAvailableAirlines = async () => {
      if (departureAirports.length === 0 || arrivalAirports.length === 0) {
        setAvailableAirlines([]);
        setSelectedAirlines([]); // Clear selected airlines when airports change
        return;
      }

      setIsLoadingAirlines(true);
      try {
        const response = await fetch('/api/load-factor/available-airlines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
                      body: JSON.stringify({
              departureAirports,
              arrivalAirports,
              startMonth: startYear && startMonth ? `${startYear}-${startMonth.toString().padStart(2, '0')}` : "",
              endMonth: endYear && endMonth ? `${endYear}-${endMonth.toString().padStart(2, '0')}` : "",
            }),
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableAirlines(data.airlines || []);
          setSelectedAirlines([]); // Clear selected airlines when new airlines are loaded
        } else {
          setAvailableAirlines([]);
          setSelectedAirlines([]); // Clear selected airlines on error
        }
      } catch (error) {
        console.error('Failed to fetch available airlines:', error);
        setAvailableAirlines([]);
        setSelectedAirlines([]); // Clear selected airlines on error
      } finally {
        setIsLoadingAirlines(false);
      }
    };

    fetchAvailableAirlines();
  }, [departureAirports, arrivalAirports]);

  const handleSearch = async () => {
    if (isSearching) return;
    
    // Validate inputs
    if (departureAirports.length === 0 || arrivalAirports.length === 0) {
      alert('Please select at least one departure and arrival airport');
      return;
    }

    // Validate date range
    if (startYear && startMonth && endYear && endMonth) {
      const startDate = new Date(startYear, startMonth - 1);
      const endDate = new Date(endYear, endMonth - 1);
      
      if (startDate > endDate) {
        alert('Start date must be before or equal to end date');
        return;
      }
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
        startMonth: startYear && startMonth ? `${startYear}-${startMonth.toString().padStart(2, '0')}` : "",
        endMonth: endYear && endMonth ? `${endYear}-${endMonth.toString().padStart(2, '0')}` : "",
        airlines: selectedAirlines,
      });
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredAirlines = airlines.filter(airline => {
    // Only show airlines if we have available airlines from the database
    if (availableAirlines.length > 0) {
      return availableAirlines.includes(airline.code);
    }
    // If no airports are selected, don't show any airlines
    return false;
  });

  const handleAirlineToggle = (airlineCode: string) => {
    setSelectedAirlines(prev => 
      prev.includes(airlineCode) 
        ? prev.filter(code => code !== airlineCode)
        : [...prev, airlineCode]
    );
  };

  const handleSelectAllAirlines = () => {
    setSelectedAirlines(filteredAirlines.map(airline => airline.code));
  };

  const handleClearAllAirlines = () => {
    setSelectedAirlines([]);
  };

  const handleClearDateRange = () => {
    setStartYear(null);
    setStartMonth(null);
    setEndYear(null);
    setEndMonth(null);
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
              <Label htmlFor="departure-airports">Departure Airports</Label>
              <AirportMultiSearch
                value={departureAirports}
                onChange={setDepartureAirports}
                placeholder="Select departure airports..."
              />
              <p className="text-xs text-muted-foreground">
                Selected: {departureAirports.length}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="arrival-airports">Arrival Airports</Label>
              <AirportMultiSearch
                value={arrivalAirports}
                onChange={setArrivalAirports}
                placeholder="Select arrival airports..."
              />
              <p className="text-xs text-muted-foreground">
                Selected: {arrivalAirports.length}
              </p>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Date Range</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearDateRange}
              >
                Clear
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Start Date</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-year" className="text-xs">Year</Label>
                    <Select value={startYear?.toString() || ""} onValueChange={(value) => {
                      const newYear = parseInt(value);
                      if (validateStartDate(newYear, startMonth || 1)) {
                        setStartYear(newYear);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year..." />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="start-month" className="text-xs">Month</Label>
                    <Select value={startMonth?.toString() || ""} onValueChange={(value) => {
                      const newMonth = parseInt(value);
                      if (validateStartDate(startYear || 2018, newMonth)) {
                        setStartMonth(newMonth);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month..." />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* End Date */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">End Date</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="end-year" className="text-xs">Year</Label>
                    <Select value={endYear?.toString() || ""} onValueChange={(value) => {
                      const newYear = parseInt(value);
                      if (validateEndDate(newYear, endMonth || 12)) {
                        setEndYear(newYear);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year..." />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end-month" className="text-xs">Month</Label>
                    <Select value={endMonth?.toString() || ""} onValueChange={(value) => {
                      const newMonth = parseInt(value);
                      if (validateEndDate(endYear || 2018, newMonth)) {
                        setEndMonth(newMonth);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month..." />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Airline Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Filter by Airlines
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllAirlines}
                  disabled={filteredAirlines.length === 0 || isLoadingAirlines}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllAirlines}
                  disabled={selectedAirlines.length === 0}
                >
                  Clear All
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedAirlines.length} of {filteredAirlines.length} selected
                </span>
              </div>
            </div>

            <div className={`space-y-4 ${!departureAirports.length || !arrivalAirports.length ? 'opacity-50 pointer-events-none' : ''}`}>
              {isLoadingAirlines ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">
                    Loading available airlines...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto border rounded-md p-4">
                  {filteredAirlines.length > 0 ? (
                    filteredAirlines.map((airline) => (
                      <div
                        key={airline.code}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedAirlines.includes(airline.code)
                            ? 'bg-primary/10 dark:bg-primary/20'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => handleAirlineToggle(airline.code)}
                      >
                        <Image
                          src={getAirlineLogoSrc(airline.code, isDark)}
                          alt={airline.name}
                          width={20}
                          height={20}
                          className="object-contain rounded-[4px]"
                          unoptimized
                        />
                        <span className="text-sm font-medium md:hidden">{airline.code}</span>
                        <span className="text-sm font-medium hidden md:block">{airline.name}</span>
                      </div>
                    ))
                  ) : (
                                         <div className="col-span-full text-center py-4 text-muted-foreground">
                       {!departureAirports.length || !arrivalAirports.length 
                         ? "Select both departure and arrival airports to see available airlines"
                         : "No airlines found for the selected route and date range"
                       }
                     </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Button */}
          <div className="flex justify-center">
            <Button 
              type="submit" 
              className="min-w-[120px]"
              disabled={isSearching || isLoading}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching
                </>
              ) : (
                'Search Load Factor'
              )}
            </Button>
          </div>


        </form>
      </CardContent>
    </Card>
  );
} 