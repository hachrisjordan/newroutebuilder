"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AirportMultiSearch } from "@/components/airport-multi-search";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, addYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { AwardFinderResults } from "@/types/award-finder-results";
import { Input } from "@/components/ui/input";
import { Progress } from '@/components/ui/progress';
import { ArrowLeftRight } from "lucide-react";

type LiveSearchResult = {
  program: string;
  from: string;
  to: string;
  depart: string;
  data?: any;
  error?: string;
};

interface LiveSearchFormProps {
  onSearch: (results: LiveSearchResult[]) => void;
}

const maxCombination = 9;
const PROGRAMS = ["b6",'as','ay'];

const getDateLabel = (date: DateRange | undefined) => {
  if (date?.from && date?.to) {
    return `${format(date.from, "MMM d, yyyy")} - ${format(date.to, "MMM d, yyyy")}`;
  }
  if (date?.from) {
    return `${format(date.from, "MMM d, yyyy")} - ...`;
  }
  return <span className="text-muted-foreground">Pick a date range</span>;
};

function getDatesInRange(from: Date, to: Date): string[] {
  const dates: string[] = [];
  let current = new Date(from);
  while (current <= to) {
    dates.push(format(current, "yyyy-MM-dd"));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const LiveSearchForm = ({ onSearch }: LiveSearchFormProps) => {
  const [origin, setOrigin] = useState<string[]>([]);
  const [destination, setDestination] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seats, setSeats] = useState<number>(1);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [partialResults, setPartialResults] = useState<LiveSearchResult[]>([]);

  const combinationCount = origin.length * destination.length;

  const isSearchEnabled =
    origin.length > 0 &&
    destination.length > 0 &&
    !!date?.from &&
    !!date?.to &&
    combinationCount <= maxCombination &&
    seats >= 1 && seats <= 9;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setProgress({ done: 0, total: 0 });
    if (!date?.from || !date?.to) {
      setError("Please select a valid date range.");
      return;
    }
    if (origin.length === 0 || destination.length === 0) {
      setError("Please select at least one origin and one destination airport.");
      return;
    }
    if (combinationCount > maxCombination) {
      setError("Too many combinations: Please select fewer airports.");
      return;
    }
    if (seats < 1 || seats > 9) {
      setError("Seats must be between 1 and 9.");
      return;
    }
    const dates = getDatesInRange(date.from, date.to);
    const total = PROGRAMS.length * origin.length * destination.length * dates.length;
    setIsLoading(true);
    setProgress({ done: 0, total });
    setPartialResults([]);
    const allResults: LiveSearchResult[] = [];
    let done = 0;
    const requests: Promise<void>[] = [];
    for (const program of PROGRAMS) {
      for (const from of origin) {
        for (const to of destination) {
          for (const depart of dates) {
            const req = new Promise<void>((resolve) => {
              const controller = new AbortController();
              const timeout = setTimeout(() => {
                controller.abort();
              }, 60000); // 60s timeout
              let attempts = 0;
              const maxAttempts = program === 'b6' ? 3 : 1;
              const doFetch = async () => {
                attempts++;
                try {
                  const res = await fetch(`https://api.bbairtools.com/api/live-search-${program}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ from, to, depart, ADT: seats }),
                    signal: controller.signal,
                  });
                  clearTimeout(timeout);
                  if (res.status === 500 && attempts < maxAttempts) {
                    // Retry for b6
                    doFetch();
                    return;
                  }
                  if (!res.ok) throw new Error(`${program.toUpperCase()} ${from}-${to} ${depart}: ${res.status}`);
                  const data = await res.json();
                  const result = { program, from, to, depart, data };
                  allResults.push(result);
                  setPartialResults(prev => {
                    const next = [...prev, result];
                    onSearch(next);
                    return next;
                  });
                } catch (err: any) {
                  clearTimeout(timeout);
                  const isTimeout = err.name === 'AbortError';
                  if (program === 'b6' && attempts < maxAttempts && String(err).includes('500')) {
                    doFetch();
                    return;
                  }
                  const result = { program, from, to, depart, error: isTimeout ? 'Timeout (60s)' : err.message };
                  allResults.push(result);
                  setPartialResults(prev => {
                    const next = [...prev, result];
                    onSearch(next);
                    return next;
                  });
                } finally {
                  done++;
                  setProgress((p) => ({ ...p, done: done }));
                  resolve();
                }
              };
              doFetch();
            });
            requests.push(req);
          }
        }
      }
    }
    await Promise.allSettled(requests);
    setIsLoading(false);
    if (allResults.length === 0) {
      setError("No results found or all requests failed.");
      return;
    }
  };

  return (
    <form className="w-full max-w-[1000px] mx-auto bg-card p-4 rounded-xl border shadow flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 md:flex-row md:gap-2 relative md:justify-end">
        <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
          <label htmlFor="origin" className="block text-sm font-medium text-foreground mb-1">Origin(s)</label>
          <AirportMultiSearch
            value={origin}
            onChange={setOrigin}
            placeholder="Search origin airports"
            className="h-9"
          />
        </div>
        <div className="flex items-center justify-center pt-6 md:pt-8">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Swap origin and destination"
            className="rounded-full border border-input shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() => {
              setOrigin(destination);
              setDestination(origin);
            }}
          >
            <ArrowLeftRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
          <label htmlFor="destination" className="block text-sm font-medium text-foreground mb-1">Destination(s)</label>
          <AirportMultiSearch
            value={destination}
            onChange={setDestination}
            placeholder="Search destination airports"
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
                {getDateLabel(date)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start">
              <Calendar
                mode="range"
                selected={date}
                fromDate={new Date()}
                toDate={addYears(new Date(), 1)}
                onSelect={(range, selectedDay) => {
                  if (date?.from && date?.to && selectedDay) {
                    setDate({ from: selectedDay, to: undefined });
                  } else {
                    setDate(range);
                    if (range?.from && range?.to) setOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-2 flex-1 w-fit">
          <label htmlFor="seats" className="block text-sm font-medium text-foreground mb-1">Seats</label>
          <Input
            id="seats"
            type="number"
            min={1}
            max={9}
            value={seats}
            onChange={e => setSeats(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div className="flex items-end flex-1 pt-6 md:pt-0 gap-2">
          <Button type="submit" className="w-full h-9" disabled={!isSearchEnabled || isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></span>Searching...</span>
            ) : "Search"}
          </Button>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      {combinationCount > maxCombination && !error && (
        <div className="text-red-600 text-sm mt-2">
          Too many combinations: Please select fewer airports.
        </div>
      )}
      {isLoading && (
        <div className="mt-4 w-full">
          <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1 text-center">
            Searching... {progress.done} / {progress.total}
          </div>
        </div>
      )}
    </form>
  );
};

export default LiveSearchForm; 