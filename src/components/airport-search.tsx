'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchAirports } from '@/lib/utils';

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

export function AirportSearch({ value, onChange, placeholder, className }: AirportSearchProps) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedOption, setSelectedOption] = useState<AirportOption | null>(null);
  const pageSize = 20;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Function to convert API response to options format
  const convertToOptions = (airports: any[]): AirportOption[] => {
    return airports.map(airport => ({
      value: airport.iata,
      label: `${airport.iata} - ${airport.city_name} (${airport.country})`,
      data: {
        city_name: airport.city_name,
        country: airport.country,
      },
    }));
  };

  // Load airports from API
  const loadAirports = useCallback(async (searchTerm: string, pageNum: number = 1, append: boolean = false) => {
    setLoading(true);
    try {
      const response = await searchAirports(searchTerm, pageNum, pageSize);
      const newOptions = convertToOptions(response.airports);
      
      if (append && pageNum > 1) {
        setOptions(prev => [...prev, ...newOptions]);
      } else {
        setOptions(newOptions);
      }
      
      setTotal(response.total);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load airports:', error);
      // On error, show empty state
      if (!append) {
        setOptions([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial options for selected value
  const loadSelectedOption = useCallback(async (iataCode: string) => {
    try {
      // Try to find the airport by searching for its IATA code
      const response = await searchAirports(iataCode, 1, 100);
      const airport = response.airports.find(a => a.iata.toUpperCase() === iataCode.toUpperCase());
      
      if (airport) {
        const option = {
          value: airport.iata,
          label: `${airport.iata} - ${airport.city_name} (${airport.country})`,
          data: {
            city_name: airport.city_name,
            country: airport.country,
          },
        };
        setSelectedOption(option);
        setSearch(option.label);
      }
    } catch (error) {
      console.error('Failed to load selected airport:', error);
    }
  }, []);

  // Initialize search with value if it exists
  useEffect(() => {
    if (value && value !== selectedOption?.value) {
      loadSelectedOption(value);
    } else if (!value) {
      setSelectedOption(null);
      setSearch('');
    }
  }, [value, selectedOption?.value, loadSelectedOption]);

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
      loadAirports(searchValue, 1, false);
    }, 300);
  };

  // Handle scroll to load more
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { target } = e;
    if (!target || loading) return;
    
    const scrollElement = target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    
    // Load more when reaching bottom
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      const nextPage = page + 1;
      if (nextPage * pageSize <= total) {
        loadAirports(search, nextPage, true);
      }
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        // Reset search to selected value if one exists
        if (selectedOption) {
          setSearch(selectedOption.label);
        } else if (!value) {
          setSearch('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, value]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Handle option selection
  const handleSelect = (option: AirportOption) => {
    onChange(option.value);
    setSelectedOption(option);
    setSearch(option.label);
    setShowDropdown(false);
  };

  // Handle input focus
  const handleFocus = () => {
    setShowDropdown(true);
    // Load options if we don't have any and no search is active
    if (options.length === 0 && !loading) {
      loadAirports('', 1, false);
    }
  };

  // Handle clear
  const handleClear = () => {
    setSearch('');
    onChange('');
    setSelectedOption(null);
    setOptions([]);
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
            onClick={handleClear}
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
          {loading && options.length === 0 && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && options.length === 0 && search && (
            <div className="px-3 py-4 text-center text-muted-foreground">
              No airports found
            </div>
          )}
          {options.map((option) => (
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
          {loading && options.length > 0 && (
            <div className="flex items-center justify-center py-2 border-t">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}