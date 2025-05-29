'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AirportSearch } from '@/components/airport-search';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export function AwardFinderSearch() {
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const getDateLabel = () => {
    if (date?.from && date?.to) {
      return `${format(date.from, 'MMM d, yyyy')} - ${format(date.to, 'MMM d, yyyy')}`;
    }
    if (date?.from) {
      return `${format(date.from, 'MMM d, yyyy')} - ...`;
    }
    return <span className="text-muted-foreground">Pick a date range</span>;
  };

  return (
    <form className="flex flex-col gap-6 w-fit mx-auto bg-card p-6 rounded-lg border shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <label htmlFor="origin" className="block text-sm font-medium text-foreground mb-1">Origin</label>
          <AirportSearch
            value={origin}
            onChange={setOrigin}
            placeholder="Search origin airport"
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <label htmlFor="destination" className="block text-sm font-medium text-foreground mb-1">Destination</label>
          <AirportSearch
            value={destination}
            onChange={setDestination}
            placeholder="Search destination airport"
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1">Date</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="justify-start text-left font-normal h-9"
              >
                {getDateLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start">
              <Calendar
                mode="range"
                selected={date}
                onSelect={(range) => {
                  setDate(range);
                  // Only close if both from and to are selected
                  if (range?.from && range?.to) setOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-end flex-1 pt-6 md:pt-0">
          <Button type="submit" className="w-full h-9">Search</Button>
        </div>
      </div>
    </form>
  );
} 