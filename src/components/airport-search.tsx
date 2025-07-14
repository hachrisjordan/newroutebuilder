'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchAirports, AirportOption } from '@/lib/airport-search';

interface AirportSearchProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
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
  const pageSize = 20;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedOption, setSelectedOption] = useState<AirportOption | null>(null);

  // Fetch airport options
  const fetchOptions = useCallback(async (searchValue: string, pageNum = 1) => {
    setLoading(true);
    try {
      const { options, total } = await searchAirports({ search: searchValue, page: pageNum, pageSize });
      setOptions(options);
      setTotal(total);
    } catch (e) {
      setOptions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on search change
  useEffect(() => {
    if (showDropdown) {
      fetchOptions(search, 1);
      setPage(1);
    }
  }, [search, showDropdown, fetchOptions]);

  // Fetch selected option for display
  useEffect(() => {
    if (value) {
      searchAirports({ search: value, page: 1, pageSize: 1 }).then(({ options }) => {
        setSelectedOption(options[0] || null);
        if (options[0]) setSearch(options[0].label);
      });
    } else {
      setSelectedOption(null);
      setSearch('');
    }
  }, [value]);

  // Handle search input
  const handleSearch = (value: string) => {
    setSearch(value);
    setShowDropdown(true);
  };

  // Handle scroll to load more
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { target } = e;
    if (!target) return;
    const scrollElement = target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !loading && options.length < total) {
      const nextPage = page + 1;
      setPage(nextPage);
      setLoading(true);
      try {
        const { options: moreOptions } = await searchAirports({ search, page: nextPage, pageSize });
        setOptions(prev => [...prev, ...moreOptions]);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        if (selectedOption) setSearch(selectedOption.label);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

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
    fetchOptions(search, 1);
    setPage(1);
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
              setOptions([]);
              setSelectedOption(null);
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