'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';

interface AirportSearchProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder: string;
}

interface AirportOption {
  value: string;
  label: string;
  data: {
    city_name: string;
    country: string;
  };
}

export function AirportSearch({ value, onChange, placeholder }: AirportSearchProps) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<AirportOption[]>([]);
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
      const option = options.find(opt => opt.value === value);
      if (option) {
        setSearch(option.label);
      }
    }
  }, [value, options]);

  // Debounced search function
  const debouncedSearch = useCallback(
    async (searchValue: string, pageNum: number) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/airports?search=${encodeURIComponent(searchValue)}&page=${pageNum}&pageSize=${pageSize}`
        );
        const data = await response.json();
        setOptions(data.airports.map((airport: any) => ({
          value: airport.iata,
          label: `${airport.iata} - ${airport.city_name} (${airport.country})`,
          data: {
            city_name: airport.city_name,
            country: airport.country
          }
        })));
        setTotal(data.total);
      } catch (error) {
        console.error('Failed to fetch airports:', error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load initial data
  useEffect(() => {
    debouncedSearch('', 1);
  }, []);

  // Handle search input
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setShowDropdown(true);
    debouncedSearch(value, 1);
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
        debouncedSearch(search, nextPage);
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
          const option = options.find(opt => opt.value === value);
          if (option) {
            setSearch(option.label);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options]);

  // Handle option selection
  const handleSelect = (option: AirportOption) => {
    onChange(option.value);
    setSearch(option.label);
    setShowDropdown(false);
  };

  // Handle input focus
  const handleFocus = () => {
    setShowDropdown(true);
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
          className="h-8 pr-8 dark:bg-background/80 dark:border-border/50"
        />
        {search && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent/50 dark:hover:bg-accent/30 rounded-sm"
            onClick={() => {
              setSearch('');
              onChange('');
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
              className="px-3 py-2 hover:bg-accent/50 dark:hover:bg-accent/30 cursor-pointer transition-colors"
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