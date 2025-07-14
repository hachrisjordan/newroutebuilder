'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchAirports, AirportOption } from '@/lib/airport-search';

interface AirportMultiSearchProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  className?: string;
}

export function AirportMultiSearch({ value, onChange, placeholder, className }: AirportMultiSearchProps) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedOptions, setSelectedOptions] = useState<AirportOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

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

  // Fetch selected options for tags
  useEffect(() => {
    if (value.length > 0) {
      Promise.all(value.map(code => searchAirports({ search: code, page: 1, pageSize: 1 })))
        .then(results => {
          setSelectedOptions(results.map(r => r.options[0]).filter(Boolean));
        });
    } else {
      setSelectedOptions([]);
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
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    fetchOptions(search, 1);
    setPage(1);
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
          onScroll={handleScroll}
        >
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
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