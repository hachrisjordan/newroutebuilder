import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, addYears } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface SearchFormProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  seatsFilter: string;
  setSeatsFilter: (seats: string) => void;
  currentMonth: Date;
  setCurrentMonth: (month: Date) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  loading: boolean;
  onSearch: () => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  date,
  setDate,
  seatsFilter,
  setSeatsFilter,
  currentMonth,
  setCurrentMonth,
  open,
  setOpen,
  loading,
  onSearch
}) => {
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
    <div className="flex flex-col gap-4 p-6 bg-card rounded-lg border">
      <h2 className="text-xl font-semibold">Search Flights</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date Range */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Date Range</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {getDateLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={date}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                fromDate={new Date()}
                toDate={addYears(new Date(), 1)}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Seats */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Number of Seats</label>
          <Select value={seatsFilter} onValueChange={setSeatsFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((seats) => (
                <SelectItem key={seats} value={seats.toString()}>
                  {seats}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">&nbsp;</label>
          <Button 
            onClick={onSearch} 
            disabled={loading || !date?.from || !date?.to}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Search Flights'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};