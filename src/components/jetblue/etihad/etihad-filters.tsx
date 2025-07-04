'use client';
import { useState } from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';
import airportsData from '@/data/airports.json';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

interface EtihadFiltersProps {
  fromOptions: string[];
  toOptions: string[];
  dateOptions: string[];
  minSeats: number;
  maxSeats: number;
  selectedFrom: string[];
  selectedTo: string[];
  selectedDates: string[];
  selectedSeats: number;
  onChange: (filters: {
    from: string[];
    to: string[];
    dates: string[];
    seats: number;
  }) => void;
}

// Build IATA to CityName map
const iataToCity: Record<string, string> = {};
(airportsData as any[]).forEach((airport: any) => {
  iataToCity[airport.IATA] = airport.CityName;
});

export default function EtihadFilters({
  fromOptions,
  toOptions,
  dateOptions,
  minSeats,
  maxSeats,
  selectedFrom,
  selectedTo,
  selectedDates,
  selectedSeats,
  onChange,
}: EtihadFiltersProps) {
  // Local state for multi-selects
  const [from, setFrom] = useState<string[]>(selectedFrom);
  const [pendingFrom, setPendingFrom] = useState<string[]>(selectedFrom);
  const [isFromOpen, setIsFromOpen] = useState(false);

  const [to, setTo] = useState<string[]>(selectedTo);
  const [pendingTo, setPendingTo] = useState<string[]>(selectedTo);
  const [isToOpen, setIsToOpen] = useState(false);

  const [dates, setDates] = useState<string[]>(selectedDates);
  const [pendingDates, setPendingDates] = useState<string[]>(selectedDates);
  const [isDatesOpen, setIsDatesOpen] = useState(false);

  const [seats, setSeats] = useState<number>(selectedSeats);

  function handleFromChange(val: string) {
    let next: string[];
    if (from.includes(val)) next = from.filter(f => f !== val);
    else next = [...from, val];
    setFrom(next);
    onChange({ from: next, to, dates, seats });
  }
  function handleToChange(val: string) {
    let next: string[];
    if (to.includes(val)) next = to.filter(f => f !== val);
    else next = [...to, val];
    setTo(next);
    onChange({ from, to: next, dates, seats });
  }
  function handleDateChange(val: string) {
    let next: string[];
    if (dates.includes(val)) next = dates.filter(f => f !== val);
    else next = [...dates, val];
    setDates(next);
    onChange({ from, to, dates: next, seats });
  }
  function handleSeatsChange(val: number) {
    setSeats(val);
    onChange({ from, to, dates, seats: val });
  }

  return (
    <div className="flex flex-wrap gap-4 items-center mb-4">
      {/* From multi-select */}
      <div>
        <span className="block text-xs font-medium mb-1 flex items-center gap-1">
          From
          <Button size="sm" variant="ghost" className="ml-1 px-1.5 py-0.5 h-6" aria-label="Reset From" onClick={() => { setFrom([]); setPendingFrom([]); onChange({ from: [], to, dates, seats }); }}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </span>
        <DropdownMenu open={isFromOpen} onOpenChange={open => {
          setIsFromOpen(open);
          if (!open) {
            setFrom(pendingFrom);
            onChange({ from: pendingFrom, to, dates, seats });
          } else {
            setPendingFrom(from);
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[175px] w-fit justify-start truncate overflow-hidden text-ellipsis">
              {isFromOpen ? pendingFrom.length ? pendingFrom.join(', ') : 'All' : from.length ? from.join(', ') : 'All'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 max-h-64 overflow-y-auto">
            {fromOptions.map(opt => (
              <DropdownMenuCheckboxItem
                key={opt}
                checked={pendingFrom.includes(opt)}
                onCheckedChange={checked => {
                  let next: string[];
                  if (checked) next = [...pendingFrom, opt];
                  else next = pendingFrom.filter(f => f !== opt);
                  setPendingFrom(next);
                }}
                onSelect={e => e.preventDefault()}
              >
                {opt} - {iataToCity[opt] || opt}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* To multi-select */}
      <div>
        <span className="block text-xs font-medium mb-1 flex items-center gap-1">
          To
          <Button size="sm" variant="ghost" className="ml-1 px-1.5 py-0.5 h-6" aria-label="Reset To" onClick={() => { setTo([]); setPendingTo([]); onChange({ from, to: [], dates, seats }); }}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </span>
        <DropdownMenu open={isToOpen} onOpenChange={open => {
          setIsToOpen(open);
          if (!open) {
            setTo(pendingTo);
            onChange({ from, to: pendingTo, dates, seats });
          } else {
            setPendingTo(to);
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[175px] w-fit justify-start truncate overflow-hidden text-ellipsis">
              {isToOpen ? pendingTo.length ? pendingTo.join(', ') : 'All' : to.length ? to.join(', ') : 'All'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 max-h-64 overflow-y-auto">
            {toOptions.map(opt => (
              <DropdownMenuCheckboxItem
                key={opt}
                checked={pendingTo.includes(opt)}
                onCheckedChange={checked => {
                  let next: string[];
                  if (checked) next = [...pendingTo, opt];
                  else next = pendingTo.filter(f => f !== opt);
                  setPendingTo(next);
                }}
                onSelect={e => e.preventDefault()}
              >
                {opt} - {iataToCity[opt] || opt}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Date multi-select */}
      <div>
        <span className="block text-xs font-medium mb-1 flex items-center gap-1">
          Date
          <Button size="sm" variant="ghost" className="ml-1 px-1.5 py-0.5 h-6" aria-label="Reset Date" onClick={() => { setDates([]); setPendingDates([]); onChange({ from, to, dates: [], seats }); }}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </span>
        <DropdownMenu open={isDatesOpen} onOpenChange={open => {
          setIsDatesOpen(open);
          if (!open) {
            setDates(pendingDates);
            onChange({ from, to, dates: pendingDates, seats });
          } else {
            setPendingDates(dates);
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="justify-start px-4 py-2">
              {isDatesOpen ? pendingDates.length ? pendingDates.join(', ') : 'All' : dates.length ? dates.join(', ') : 'All'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 max-h-64 overflow-y-auto">
            {dateOptions.map(opt => (
              <DropdownMenuCheckboxItem
                key={opt}
                checked={pendingDates.includes(opt)}
                onCheckedChange={checked => {
                  let next: string[];
                  if (checked) next = [...pendingDates, opt];
                  else next = pendingDates.filter(f => f !== opt);
                  setPendingDates(next);
                }}
                onSelect={e => e.preventDefault()}
              >
                {opt}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Seats slider */}
      <div className="flex flex-col items-start min-w-[160px]">
        <span className="block text-xs font-medium mb-1 flex items-center gap-1">
          Seats
          <Button size="sm" variant="ghost" className="ml-1 px-1.5 py-0.5 h-6" aria-label="Reset Seats" onClick={() => { setSeats(minSeats); onChange({ from, to, dates, seats: minSeats }); }}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </span>
        <div className="flex items-center gap-2 w-full">
          <Slider min={minSeats} max={maxSeats} value={[seats]} onValueChange={([v]) => handleSeatsChange(v)} className="w-28" />
          <span className="font-mono text-sm ml-2">{seats}</span>
        </div>
      </div>
    </div>
  );
} 