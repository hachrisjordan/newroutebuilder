'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchAirports } from '@/lib/utils';

interface AirportMultiSearchProps {
  value: string[];
  onChange: (value: string[]) => void;
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

export function AirportMultiSearch({ value, onChange, placeholder, className }: AirportMultiSearchProps) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<AirportOption[]>([]);
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
  const loadAirports = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const response = await searchAirports(searchTerm, 1, 50); // Load more for multi-select
      const newOptions = convertToOptions(response.airports);
      setOptions(newOptions);
    } catch (error) {
      console.error('Failed to load airports:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load selected options for display
  const loadSelectedOptions = useCallback(async (iataCodes: string[]) => {
    if (iataCodes.length === 0) {
      setSelectedOptions([]);
      return;
    }

    try {
      // Load all selected airports by searching for each IATA code
      const selectedAirports: AirportOption[] = [];
      
      for (const code of iataCodes) {
        try {
          const response = await searchAirports(code, 1, 100);
          const airport = response.airports.find(a => a.iata.toUpperCase() === code.toUpperCase());
          
          if (airport) {
            selectedAirports.push({
              value: airport.iata,
              label: `${airport.iata} - ${airport.city_name} (${airport.country})`,
              data: {
                city_name: airport.city_name,
                country: airport.country,
              },
            });
          }
        } catch (error) {
          console.error(`Failed to load airport ${code}:`, error);
        }
      }
      
      setSelectedOptions(selectedAirports);
    } catch (error) {
      console.error('Failed to load selected airports:', error);
    }
  }, []);

  // Initialize selected options when value changes
  useEffect(() => {
    if (value.length !== selectedOptions.length || 
        !value.every(v => selectedOptions.some(opt => opt.value === v))) {
      loadSelectedOptions(value);
    }
  }, [value, selectedOptions, loadSelectedOptions]);

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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Handle option selection (toggle)
  const handleSelect = (option: AirportOption) => {
    if (value.includes(option.value)) {
      onChange(value.filter(v => v !== option.value));
    } else {
      onChange([...value, option.value]);
    }
    setSearch('');
    setShowDropdown(false);
  };

  // Remove selected airport
  const handleRemove = (code: string) => {
    onChange(value.filter(v => v !== code));
  };

  // Handle input focus
  const handleFocus = () => {
    setShowDropdown(true);
    // Load options if we don't have any and no search is active
    if (options.length === 0 && !loading) {
      loadAirports('');
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={cn(
          'flex items-center flex-wrap gap-1 px-2 py-1 border rounded-md bg-background focus-within:ring-2 focus-within:ring-primary min-h-[2.25rem] w-full min-w-0 max-w-full',
          'sm:py-1 sm:px-2',
          className
        )}
        onClick={() => inputRef.current?.focus()}
        tabIndex={-1}
        style={{ cursor: 'text', overflowX: 'auto' }}
      >
        {selectedOptions.map(opt => (
          <span
            key={opt.value}
            className="inline-flex items-center bg-accent/60 text-[11px] rounded-sm px-1.5 py-0.5 mr-0.5 mb-0.5 max-w-[80px] truncate"
            title={opt.value}
          >
            <span className="truncate max-w-[54px]">{opt.value}</span>
            <button
              type="button"
              className="ml-0.5 text-muted-foreground hover:text-foreground p-0"
              onClick={e => { e.stopPropagation(); handleRemove(opt.value); }}
              tabIndex={-1}
              style={{ minWidth: 18, minHeight: 18 }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          placeholder={selectedOptions.length === 0 ? placeholder : ''}
          value={search}
          onChange={e => handleSearch(e.target.value)}
          onFocus={handleFocus}
          className="flex-1 min-w-[60px] bg-transparent outline-none border-none focus:ring-0 p-0 m-0 text-sm w-full max-w-full"
          style={{ minWidth: '60px' }}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === 'Tab') && showDropdown && options.length > 0) {
              e.preventDefault();
              handleSelect(options[0]);
            } else if (e.key === 'Backspace' && !search && value.length > 0) {
              e.preventDefault();
              handleRemove(value[value.length - 1]);
            }
          }}
        />
      </div>
      {showDropdown && (search || options.length > 0) && (
        <div
          className="absolute z-50 w-full min-w-[250px] mt-1 bg-popover/95 dark:bg-popover/90 rounded-md shadow-lg border dark:border-border/50 max-h-[300px] overflow-y-auto min-w-0"
        >
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && options.length === 0 && search && (
            <div className="px-3 py-4 text-center text-muted-foreground">
              No airports found
            </div>
          )}
          {!loading && options.map(option => (
            <div
              key={option.value}
              className={cn(
                'px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors select-none',
                value.includes(option.value)
                  ? 'bg-primary/10 dark:bg-primary/20 font-semibold text-primary'
                  : 'pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30'
              )}
              onClick={() => handleSelect(option)}
              style={{ minHeight: 40 }}
            >
              <div className="flex flex-col">
                <span className="font-bold dark:text-foreground/90 text-sm sm:text-base">{option.value}</span>
                <span className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground/80">
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