'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { AirportSearch } from '@/components/airport-search';
import { useTheme } from 'next-themes';
import { getAirlineLogoSrc } from '@/lib/utils';

interface Airline {
  code: string;
  name: string;
  logo: string;
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
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      let url = `https://rbbackend-fzkmdxllwa-uc.a.run.app/api/flightradar24/${selectedAirline}${flightNumber}`;
      
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
      onSearch({
        airline: selectedAirline,
        flightNumber,
        originAirport,
        arrivalAirport,
        flightData: data
      });
    } catch (error) {
      console.error('Error fetching flight data:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredAirlines = airlines.filter(airline => {
    const searchLower = searchTerm.toLowerCase();
    return airline.code.toLowerCase().includes(searchLower) || 
           airline.name.toLowerCase().includes(searchLower);
  });

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="p-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault();
            handleSearch();
          }}
        >
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
            <div className="w-20">
              <Input
                id="flightNumber"
                name="flightNumber"
                type="number"
                min={0}
                max={9999}
                maxLength={4}
                placeholder="#"
                value={flightNumber}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  setFlightNumber(val);
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

          {showAdvanced && (
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