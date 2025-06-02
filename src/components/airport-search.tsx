'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import airportsData from '@/data/airports.json';

interface AirportSearchProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

interface AirportOption {
  value: string;
  label: string;
  data: {
    city_name: string;
    country: string;
  };
}

// Helper to parse search input (copied from seat-type-viewer.jsx)
const parseSearchInput = (inputValue: any) => {
  if (!inputValue) return '';
  try {
    if (typeof inputValue === 'object' && inputValue !== null) {
      if (inputValue._searchText) {
        return String(inputValue._searchText).toLowerCase();
      } else if (inputValue.input) {
        return String(inputValue.input).toLowerCase();
      } else if (inputValue.searchText) {
        return String(inputValue.searchText).toLowerCase();
      } else if (inputValue.value) {
        return String(inputValue.value).toLowerCase();
      } else if (inputValue.searchValue) {
        return String(inputValue.searchValue).toLowerCase();
      } else {
        const str = String(inputValue);
        if (str.startsWith('{') && str.includes('searchValue')) {
          try {
            const parsed = JSON.parse(str);
            if (parsed.searchValue) {
              return String(parsed.searchValue).toLowerCase();
            }
          } catch (e) {}
        }
        return '';
      }
    } else {
      return String(inputValue || '').toLowerCase();
    }
  } catch (error) {
    return '';
  }
};

// Build airport options from JSON
const airportOptions: AirportOption[] = (airportsData as any[]).map((airport: any) => ({
  value: airport.IATA,
  label: `${airport.IATA} - ${airport.CityName} (${airport.Country})`,
  data: {
    city_name: airport.CityName,
    country: airport.Country,
  },
}));

export function AirportSearch({ value, onChange, placeholder, className }: AirportSearchProps) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<AirportOption[]>(airportOptions);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize search with value if it exists
  useEffect(() => {
    if (value) {
      const option = airportOptions.find(opt => opt.value === value);
      if (option) {
        setSearch(option.label);
      }
    }
  }, [value]);

  // Filtering and sorting logic (EXACT from seat-type-viewer.jsx)
  const filterAndSortOptions = useCallback((input: string) => {
    if (!input) return airportOptions;
    const searchText = parseSearchInput(input);
    return airportOptions
      .filter(option => {
        const iata = String(option.value || '').toLowerCase();
        const label = String(option.label || '').toLowerCase();
        return iata.includes(searchText) || label.includes(searchText);
      })
      .sort((a, b) => {
        const input = searchText;
        const iataA = String(a.value || '').toLowerCase();
        const iataB = String(b.value || '').toLowerCase();
        let scoreA = 0;
        let scoreB = 0;
        if (iataA === input) scoreA = 1000;
        if (iataB === input) scoreB = 1000;
        if (iataA.startsWith(input) && iataA !== input) scoreA = 500;
        if (iataB.startsWith(input) && iataB !== input) scoreB = 500;
        if (iataA.includes(input) && !iataA.startsWith(input)) scoreA = 200;
        if (iataB.includes(input) && !iataB.startsWith(input)) scoreB = 200;
        const labelA = String(a.label || '').toLowerCase();
        const labelB = String(b.label || '').toLowerCase();
        if (scoreA === 0 && labelA.includes(input)) scoreA = 10;
        if (scoreB === 0 && labelB.includes(input)) scoreB = 10;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return String(iataA).localeCompare(String(iataB));
      });
  }, []);

  // Handle search input
  const handleSearch = (value: string) => {
    setSearch(value);
    setShowDropdown(true);
    setOptions(filterAndSortOptions(value));
  };

  // Handle scroll to load more
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { target } = e;
    if (!target) return;
    
    const scrollElement = target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    
    // Load more when reaching bottom
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      const nextPage = page + 1;
      if (nextPage * pageSize <= total) {
        setPage(nextPage);
        setOptions(filterAndSortOptions(search));
      }
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        // Reset search to selected value if one exists
        if (value) {
          const option = airportOptions.find(opt => opt.value === value);
          if (option) {
            setSearch(option.label);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  // Handle option selection
  const handleSelect = (option: AirportOption) => {
    onChange(option.value);
    setSearch(option.label);
    setShowDropdown(false);
  };

  // Handle input focus
  const handleFocus = () => {
    setShowDropdown(true);
    setOptions(filterAndSortOptions(search));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleFocus}
          className={cn("pr-8 dark:bg-background/80 dark:border-border/50", className)}
        />
        {search && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent/50 dark:hover:bg-accent/30 rounded-sm"
            onClick={() => {
              setSearch('');
              onChange('');
              setOptions(airportOptions);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {showDropdown && (search || options.length > 0) && (
        <div 
          className="absolute z-50 w-full mt-1 bg-popover/95 dark:bg-popover/90 rounded-md shadow-lg border dark:border-border/50 max-h-[300px] overflow-y-auto"
          onScroll={handleScroll}
        >
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && options.map((option) => (
            <div
              key={option.value}
              className="px-3 py-2 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 cursor-pointer transition-colors touch-manipulation select-none"
              onClick={() => handleSelect(option)}
            >
              <div className="flex flex-col">
                <span className="font-bold dark:text-foreground/90">{option.value}</span>
                <span className="text-sm text-muted-foreground dark:text-muted-foreground/80">
                  {option.data.city_name} ({option.data.country})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}