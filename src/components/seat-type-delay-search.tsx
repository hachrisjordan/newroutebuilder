'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, Loader2, X, Info } from 'lucide-react';
import { AirportSearch } from '@/components/airport-search';
import { useTheme } from 'next-themes';
import { getAirlineLogoSrc } from '@/lib/utils';
import { TooltipTouch } from '@/components/ui/tooltip-touch';

interface Airline {
  code: string;
  name: string;
  logo: string;
}

interface FlightValidity {
  flightnumber: string;
  deptime: string;
  destime: string;
  datefrom: string;
  dateto: string;
}

interface RouteValidityResponse {
  success: boolean;
  flights: FlightValidity[];
  metadata: {
    departure: { iata: string; id: number };
    destination: { iata: string; id: number };
    airline: { iata: string; id: number };
  };
}

interface SeatTypeDelaySearchProps {
  onSearch: (params: {
    airline: string | undefined;
    flightNumber: string;
    originAirport: string | undefined;
    arrivalAirport: string | undefined;
    flightData?: any;
  }) => void;
}

const ALLOWED_AIRLINE_CODES = [
  'EI', 'LX', 'UX', 'WS', 'VJ', 'DE', '4Y', 'WK', 'EW', 'FI', 'AZ', 'HO', 'VA',
  'EN', 'CZ', 'DL', 'HA', 'B6', 'AA', 'UA', 'NK', 'F9', 'G4', 'AS', 'A3', 'NZ',
  'OZ', 'MS', 'SA', 'TP', 'SN', 'AV', 'OU', 'MX', 'ME', 'KQ', 'MF', 'RO', 'AR',
  'AM', 'SK', 'ZH', 'LA', 'AY', 'JX', 'FJ', 'KL', 'RJ', 'UL', 'AT', 'AC', 'LO',
  'IB', 'CA', 'MU', 'TK', 'GA', 'MH', 'JL', 'NH', 'QR', 'AF', 'LH', 'BA', 'SQ',
  'EK', 'KE', 'AI', 'EY', 'TG', 'QF', 'CX', 'VN', 'CI', 'BR', 'VS', 'SV', 'CM',
  'ET', 'PR', 'OS'
];

export function SeatTypeDelaySearch({ onSearch }: SeatTypeDelaySearchProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [selectedAirline, setSelectedAirline] = useState<string | undefined>();
  const [flightNumber, setFlightNumber] = useState('');
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [originAirport, setOriginAirport] = useState<string>();
  const [arrivalAirport, setArrivalAirport] = useState<string>();
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [findFlightNumber, setFindFlightNumber] = useState(false);
  const [routeAirlines, setRouteAirlines] = useState<string[]>([]);
  const [bothAirportsFilled, setBothAirportsFilled] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeValidityData, setRouteValidityData] = useState<RouteValidityResponse | null>(null);
  const [isLoadingValidity, setIsLoadingValidity] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchingFlight, setSearchingFlight] = useState<string | null>(null);
  const [showFlightTable, setShowFlightTable] = useState(true);
  const itemsPerPage = 5;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to detect and extract airline code from flight number
  const detectAirlineCode = (input: string) => {
    const match = input.match(/^([A-Z]{2})\s*(\d+)$/);
    if (match) {
      const [, airlineCode, flightNum] = match;
      const foundAirline = airlines.find(a => a.code === airlineCode);
      if (foundAirline) {
        return { airlineCode, flightNum, foundAirline };
      }
    }
    return null;
  };

  // Check if both airports are filled
  useEffect(() => {
    const filled = !!(originAirport && arrivalAirport);
    setBothAirportsFilled(filled);
    
    // Reset airline when airports change
    if (selectedAirline) {
      setSelectedAirline(undefined);
      setDisplayValue('');
      setSearchTerm('');
    }
  }, [originAirport, arrivalAirport]);

  // Fetch route airlines when both airports are filled
  useEffect(() => {
    const fetchRouteAirlines = async () => {
      if (!bothAirportsFilled || !originAirport || !arrivalAirport) {
        setRouteAirlines([]);
        return;
      }

      setIsLoadingRoute(true);
      try {
        const response = await fetch(`/api/routes?origin=${originAirport}&destination=${arrivalAirport}`);
        if (response.ok) {
          const data = await response.json();
          const airlines = data.map((route: any) => route.Airline);
          setRouteAirlines(airlines);
        } else {
          setRouteAirlines([]);
        }
      } catch (error) {
        console.error('Failed to fetch route airlines:', error);
        setRouteAirlines([]);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRouteAirlines();
  }, [bothAirportsFilled, originAirport, arrivalAirport]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [airlinesRes] = await Promise.all([
          fetch('/api/airlines')
        ]);
    
        const [airlinesData] = await Promise.all([
          airlinesRes.json()
        ]);
        
        setAirlines(airlinesData.filter((airline: Airline) => ALLOWED_AIRLINE_CODES.includes(airline.code)));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (isSearching) return;
    
    setIsSearching(true);
    try {
      let url = `https://api.bbairtools.com/api/flightradar24/${selectedAirline}${flightNumber}`;
      
      // Add query parameters if origin and arrival airports are provided
      const queryParams = new URLSearchParams();
      if (originAirport) queryParams.append('origin', originAirport);
      if (arrivalAirport) queryParams.append('destination', arrivalAirport);
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch flight data');
      }
      
      const data = await response.json();
      
      // Transform the data to match the expected interface
      const transformedData = data.map((flight: any) => ({
        flightNumber: flight.flightNumber,
        date: flight.date,
        registration: flight.registration,
        origin: flight.originIata,
        destination: flight.destinationIata,
        ontime: flight.ontime
      }));
      
      onSearch({
        airline: selectedAirline,
        flightNumber,
        originAirport,
        arrivalAirport,
        flightData: transformedData
      });
    } catch (error) {
      console.error('Error fetching flight data:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Filter airlines based on route when both airports are filled
  const filteredAirlines = airlines.filter(airline => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = airline.code.toLowerCase().includes(searchLower) || 
           airline.name.toLowerCase().includes(searchLower);
    
    // If both airports are filled, only show airlines that operate on this route
    if (bothAirportsFilled && routeAirlines.length > 0) {
      return matchesSearch && routeAirlines.includes(airline.code);
    }
    
    return matchesSearch;
  });

  // Fetch route validity data when airline is selected
  const fetchRouteValidity = async (airlineCode: string) => {
    if (!originAirport || !arrivalAirport) return;

    setIsLoadingValidity(true);
    try {
      const response = await fetch('https://api.bbairtools.com/api/route-validity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dep: originAirport,
          des: arrivalAirport,
          airline: airlineCode
        })
      });

      if (response.ok) {
        const data: RouteValidityResponse = await response.json();
        setRouteValidityData(data);
      } else {
        console.error('Failed to fetch route validity data');
        setRouteValidityData(null);
      }
    } catch (error) {
      console.error('Error fetching route validity:', error);
      setRouteValidityData(null);
    } finally {
      setIsLoadingValidity(false);
    }
  };

  // Call route validity when airline is selected
  useEffect(() => {
    if (selectedAirline && originAirport && arrivalAirport) {
      fetchRouteValidity(selectedAirline);
      setCurrentPage(1); // Reset to first page when new data is loaded
    } else {
      setRouteValidityData(null);
    }
  }, [selectedAirline, originAirport, arrivalAirport]);

  // Calculate pagination data
  const totalPages = routeValidityData?.flights ? Math.ceil(routeValidityData.flights.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFlights = routeValidityData?.flights?.slice(startIndex, endIndex) || [];

  // Group flights by flight number and combine timings
  const getGroupedFlightRows = (flights: FlightValidity[]) => {
    const groupedFlights: { [key: string]: FlightValidity[] } = {};

    flights.forEach(flight => {
      if (!groupedFlights[flight.flightnumber]) {
        groupedFlights[flight.flightnumber] = [];
      }
      groupedFlights[flight.flightnumber].push(flight);
    });

    return Object.entries(groupedFlights).map(([flightNumber, flightGroup]) => {
      // Group by timing and collect periods for each timing
      const timingGroups: { [key: string]: FlightValidity[] } = {};
      
      flightGroup.forEach(flight => {
        const timing = `${flight.deptime.slice(0, 5)} - ${flight.destime.slice(0, 5)}`;
        if (!timingGroups[timing]) {
          timingGroups[timing] = [];
        }
        timingGroups[timing].push(flight);
      });

      const timingsWithPeriods = Object.entries(timingGroups).map(([timing, flights]) => ({
        timing,
        periods: flights.map(f => {
          if (f.datefrom === f.dateto) {
            return f.datefrom;
          }
          return `${f.datefrom} - ${f.dateto}`;
        })
      }));

      return {
        flightnumber: flightNumber,
        timingsWithPeriods,
        sampleFlight: flightGroup[0] // Use first flight for reference
      };
    });
  };

  const groupedFlights = routeValidityData?.flights ? getGroupedFlightRows(routeValidityData.flights) : [];
  const totalGroupedPages = Math.ceil(groupedFlights.length / itemsPerPage);
  const startGroupedIndex = (currentPage - 1) * itemsPerPage;
  const endGroupedIndex = startGroupedIndex + itemsPerPage;
  const currentGroupedFlights = groupedFlights.slice(startGroupedIndex, endGroupedIndex);

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="p-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault();
            if (!findFlightNumber) {
            handleSearch();
            }
          }}
        >
          <div className="flex items-center space-x-2 mb-2">
            <Switch
              id="find-flight-number"
              checked={findFlightNumber}
              onCheckedChange={setFindFlightNumber}
            />
            <Label htmlFor="find-flight-number" className="text-sm font-medium">
              Find flight number
            </Label>
          </div>

          {findFlightNumber ? (
            // New view when switch is enabled
            <div className="flex flex-col gap-3">
              {/* First line: Departure and Arrival airports */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <AirportSearch
                    value={originAirport}
                    onChange={setOriginAirport}
                    placeholder="Select departure airport"
                  />
                </div>
                <div>
                  <AirportSearch
                    value={arrivalAirport}
                    onChange={setArrivalAirport}
                    placeholder="Select arrival airport"
                  />
                </div>
              </div>
              
              {/* Second line: Airline selection */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex-1 max-w-[270px]" ref={dropdownRef}>
                  <div className="relative">
                    {selectedAirline ? (
                      <div 
                        className="h-8 pl-8 pr-8 flex items-center border rounded-md bg-background/50 text-sm cursor-text relative dark:bg-background/80 dark:border-border/50"
                        onClick={() => bothAirportsFilled && setShowDropdown(true)}
                      >
                        <Image
                          src={getAirlineLogoSrc(selectedAirline || '', isDark)}
                          alt={airlines.find(a => a.code === selectedAirline)?.name || ''}
                          width={20}
                          height={20}
                          className="absolute left-2 top-1/2 -translate-y-1/2 object-contain rounded-[4px]"
                          unoptimized
                        />
                        <span className="dark:text-foreground/90">
                          {airlines.find(a => a.code === selectedAirline)?.name} - <span className="font-bold">{selectedAirline}</span>
                        </span>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 rounded-sm touch-manipulation select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAirline(undefined);
                            setDisplayValue('');
                            setSearchTerm('');
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder={
                          !bothAirportsFilled 
                            ? "Select both airports first" 
                            : isLoadingRoute 
                              ? "Loading airlines..." 
                              : isLoading 
                                ? "Loading..." 
                                : "Select airline..."
                        }
                        value={displayValue}
                        onChange={(e) => {
                          if (!bothAirportsFilled) return;
                          setDisplayValue(e.target.value);
                          setSearchTerm(e.target.value);
                          setSelectedAirline(undefined);
                          setShowDropdown(true);
                        }}
                        onFocus={() => bothAirportsFilled && setShowDropdown(true)}
                        className="h-8 pl-8"
                        disabled={isLoading || !bothAirportsFilled || isLoadingRoute}
                      />
                    )}
                  </div>
                  {showDropdown && !isLoading && bothAirportsFilled && !isLoadingRoute && (
                    <div className="absolute z-10 mt-1 max-h-60 w-[300px] overflow-auto rounded-md bg-popover/95 dark:bg-popover/90 py-1 shadow-lg border dark:border-border/50">
                      {filteredAirlines.length > 0 ? (
                        filteredAirlines.map((airline) => (
                          <div
                            key={airline.code}
                            className="flex items-center gap-2 px-2 py-1.5 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 cursor-pointer transition-colors touch-manipulation select-none"
                            onClick={() => {
                              setSelectedAirline(airline.code);
                              const selectedAirlineName = airlines.find(a => a.code === airline.code)?.name || '';
                              setDisplayValue(`${selectedAirlineName} - ${airline.code}`);
                              setSearchTerm('');
                              setShowDropdown(false);
                            }}
                          >
                            <Image
                              src={getAirlineLogoSrc(airline.code, isDark)}
                              alt={airline.name}
                              width={20}
                              height={20}
                              className="object-contain rounded-[4px]"
                              unoptimized
                            />
                            <div className="flex flex-col">
                              <span className="text-sm">{airline.name} - <span className="font-bold">{airline.code}</span></span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {bothAirportsFilled && routeAirlines.length === 0 
                            ? "No airlines found for this route" 
                            : "No airlines found"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <TooltipTouch
                  content={
                    <div>
                      {showFlightTable ? "Hide flight schedules" : "Show flight schedules"}
                    </div>
                  }
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setShowFlightTable(!showFlightTable)}
                    disabled={!selectedAirline}
                  >
                    {showFlightTable ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTouch>
              </div>
            </div>
          ) : (
            // Original view when switch is disabled
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 max-w-[270px]" ref={dropdownRef}>
              <div className="relative">
                {selectedAirline ? (
                  <div 
                    className="h-8 pl-8 pr-8 flex items-center border rounded-md bg-background/50 text-sm cursor-text relative dark:bg-background/80 dark:border-border/50"
                    onClick={() => setShowDropdown(true)}
                  >
                    <Image
                      src={getAirlineLogoSrc(selectedAirline || '', isDark)}
                      alt={airlines.find(a => a.code === selectedAirline)?.name || ''}
                      width={20}
                      height={20}
                      className="absolute left-2 top-1/2 -translate-y-1/2 object-contain rounded-[4px]"
                      unoptimized
                    />
                    <span className="block sm:hidden font-bold">{selectedAirline}</span>
                    <span className="hidden sm:block dark:text-foreground/90">
                      {airlines.find(a => a.code === selectedAirline)?.name} - <span className="font-bold">{selectedAirline}</span>
                    </span>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 rounded-sm touch-manipulation select-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAirline(undefined);
                        setDisplayValue('');
                        setSearchTerm('');
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Input
                    type="text"
                    placeholder={isLoading ? "Loading..." : "Select airline..."}
                    value={displayValue}
                    onChange={(e) => {
                      setDisplayValue(e.target.value);
                      setSearchTerm(e.target.value);
                      setSelectedAirline(undefined);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="h-8 pl-8"
                    disabled={isLoading}
                  />
                )}
              </div>
              {showDropdown && !isLoading && (
                <div className="absolute z-10 mt-1 max-h-60 w-[300px] overflow-auto rounded-md bg-popover/95 dark:bg-popover/90 py-1 shadow-lg border dark:border-border/50">
                  {filteredAirlines.length > 0 ? (
                    filteredAirlines.map((airline) => (
                      <div
                        key={airline.code}
                        className="flex items-center gap-2 px-2 py-1.5 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 cursor-pointer transition-colors touch-manipulation select-none"
                        onClick={() => {
                          setSelectedAirline(airline.code);
                          const selectedAirlineName = airlines.find(a => a.code === airline.code)?.name || '';
                          setDisplayValue(`${selectedAirlineName} - ${airline.code}`);
                          setSearchTerm('');
                          setShowDropdown(false);
                        }}
                      >
                        <Image
                          src={getAirlineLogoSrc(airline.code, isDark)}
                          alt={airline.name}
                          width={20}
                          height={20}
                          className="object-contain rounded-[4px]"
                          unoptimized
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{airline.name} - <span className="font-bold">{airline.code}</span></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No airlines found</div>
                  )}
                </div>
              )}
            </div>
            <div className="w-24">
              <Input
                id="flightNumber"
                name="flightNumber"
                type="text"
                maxLength={7}
                placeholder="#"
                value={flightNumber}
                onChange={e => {
                  const input = e.target.value.toUpperCase();
                  const val = input.replace(/[^A-Z0-9\s]/g, '').slice(0, 7);
                  setFlightNumber(val);
                  
                  // Auto-detect airline code in first 2 characters
                  const detected = detectAirlineCode(val);
                  if (detected) {
                    setSelectedAirline(detected.airlineCode);
                    const selectedAirlineName = detected.foundAirline.name;
                    setDisplayValue(`${selectedAirlineName} - ${detected.airlineCode}`);
                    setSearchTerm('');
                    setShowDropdown(false);
                    setFlightNumber(detected.flightNum);
                  }
                }}
                required
                className="h-8"
                disabled={isSearching}
              />
            </div>
            <Button 
              type="submit" 
              className="h-8 min-w-[80px]"
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching
                </>
              ) : (
                'Search'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isSearching}
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          )}

          {/* Route Validity Table */}
          {findFlightNumber && selectedAirline && showFlightTable && (isLoadingValidity || routeValidityData) && (
            <div className="mt-4">
              {isLoadingValidity ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading flight schedules...</span>
                </div>
              ) : routeValidityData && routeValidityData.success && groupedFlights.length > 0 ? (
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                      <tbody>
                        {currentGroupedFlights.map((group, index) => (
                          <tr key={index} className="hover:bg-accent/50">
                            <td className="px-3 py-2 font-medium">
                              <div className="flex items-center gap-2">
                                <Image
                                  src={getAirlineLogoSrc(selectedAirline || '', isDark)}
                                  alt={airlines.find(a => a.code === selectedAirline)?.name || ''}
                                  width={16}
                                  height={16}
                                  className="object-contain rounded-[3px]"
                                  unoptimized
                                />
                                <span>
                                  {group.flightnumber.replace(/^([A-Z]{2})(\d+)/, '$1 $2')}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              <div className="space-y-1">
                                {group.timingsWithPeriods.map((timingGroup, timingIndex) => (
                                  <div key={timingIndex} className="flex items-center gap-1">
                                    <span>{timingGroup.timing}</span>
                                    <TooltipTouch
                                      content={
                                        <div>
                                          <p className="font-medium mb-1">Applicable periods:</p>
                                          {timingGroup.periods.map((period, periodIndex) => (
                                            <p key={periodIndex} className="text-sm">
                                              {period}
                                            </p>
                                          ))}
                                        </div>
                                      }
                                    >
                                      <Info className="h-3 w-3 text-muted-foreground/70 hover:text-muted-foreground/90" />
                                    </TooltipTouch>
                                  </div>
                                ))}
                              </div>
                            </td>
                                                       <td className="px-3 py-2">
                             <Button
                               size="sm"
                               variant="outline"
                               className="h-8 min-w-[80px]"
                               disabled={searchingFlight === group.flightnumber}
                               onClick={async () => {
                                 setSearchingFlight(group.flightnumber);
                                 try {
                                   const response = await fetch(`https://api.bbairtools.com/api/flightradar24/${group.flightnumber}?origin=${originAirport}&destination=${arrivalAirport}`);
                                   if (response.ok) {
                                     const data = await response.json();
                                     
                                     // Transform the data to match the expected interface (same as original handleSearch)
                                     const transformedData = data.map((flight: any) => ({
                                       flightNumber: flight.flightNumber,
                                       date: flight.date,
                                       registration: flight.registration,
                                       origin: flight.originIata,
                                       destination: flight.destinationIata,
                                       ontime: flight.ontime
                                     }));
                                     
                                     // Call onSearch with the same format as original search
                                     onSearch({
                                       airline: selectedAirline,
                                       flightNumber: group.flightnumber.replace(/[^0-9]/g, ''),
                                       originAirport,
                                       arrivalAirport,
                                       flightData: transformedData
                                     });
                                   } else {
                                     console.error('Failed to fetch Flightradar24 data');
                                   }
                                 } catch (error) {
                                   console.error('Error fetching Flightradar24 data:', error);
                                 } finally {
                                   setSearchingFlight(null);
                                 }
                               }}
                             >
                               {searchingFlight === group.flightnumber ? (
                                 <>
                                   <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                   Searching
                                 </>
                               ) : (
                                 'Search'
                               )}
                             </Button>
                           </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  {totalGroupedPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
                      <div className="text-xs text-muted-foreground">
                        Showing {startGroupedIndex + 1}-{Math.min(endGroupedIndex, groupedFlights.length)} of {groupedFlights.length}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="h-6 w-6 p-0"
                        >
                          ←
                        </Button>
                        <span className="text-xs px-2">
                          {currentPage} / {totalGroupedPages}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCurrentPage(Math.min(totalGroupedPages, currentPage + 1))}
                          disabled={currentPage === totalGroupedPages}
                          className="h-6 w-6 p-0"
                        >
                          →
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : routeValidityData && !routeValidityData.success ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No flight schedules found for this route
                </div>
              ) : null}
            </div>
          )}

          {!findFlightNumber && showAdvanced && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <AirportSearch
                  value={originAirport}
                  onChange={setOriginAirport}
                  placeholder="Select origin airport"
                />
              </div>
              <div>
                <AirportSearch
                  value={arrivalAirport}
                  onChange={setArrivalAirport}
                  placeholder="Select arrival airport"
                />
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
} 