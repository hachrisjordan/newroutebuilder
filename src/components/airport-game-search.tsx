'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Airport } from '@/lib/airport-game';

interface AirportGameSearchProps {
  onAirportSelect: (airport: Airport) => void;
  selectedAirport: Airport | null;
}

interface AirportOption {
  iata: string;
  name: string;
  city_name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export function AirportGameSearch({ onAirportSelect, selectedAirport }: AirportGameSearchProps) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load airports from API
  const loadAirports = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/airports?search=${encodeURIComponent(searchTerm)}&pageSize=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch airports');
      }
      const data = await response.json();
      setOptions(data.airports || []);
    } catch (error) {
      console.error('Failed to load airports:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search input with debouncing
  const handleSearch = (searchValue: string) => {
    setSearch(searchValue);
    setShowDropdown(true);
    
    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounce timer
    debounceRef.current = setTimeout(() => {
      loadAirports(searchValue);
    }, 300);
  };

  // Handle airport selection
  const handleSelect = (airport: AirportOption) => {
    onAirportSelect(airport);
    setSearch(`${airport.iata} - ${airport.name}`);
    setShowDropdown(false);
  };

  // Handle clear selection
  const handleClear = () => {
    setSearch('');
    setOptions([]);
    setShowDropdown(false);
    onAirportSelect(null as any);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize with selected airport
  useEffect(() => {
    if (selectedAirport) {
      setSearch(`${selectedAirport.iata} - ${selectedAirport.name}`);
    } else {
      setSearch('');
    }
  }, [selectedAirport]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for an airport..."
            className="pl-10 pr-10"
            onFocus={() => setShowDropdown(true)}
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-1">Searching airports...</p>
            </div>
          ) : options.length > 0 ? (
            <div className="py-1">
              {options.map((airport) => (
                <button
                  key={airport.iata}
                  className="w-full px-4 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none"
                  onClick={() => handleSelect(airport)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {airport.iata}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{airport.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {airport.city_name}, {airport.country}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : search.trim() ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">No airports found</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
} 