'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useEffect, useState, useTransition } from 'react';
import EtihadFilters from './etihad-filters';
import EtihadControls from './etihad-controls';
import EtihadItineraryCard from './etihad-itinerary-card';
import EtihadPagination from './etihad-pagination';
import { Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Itinerary {
  id: string;
  from_airport: string;
  to_airport: string;
  connections: string[];
  depart: string;
  arrive: string;
  duration: number;
  segment_ids: string[];
  layover: number;
  points: number;
  fare_tax: number;
  cabin_class: string;
  inventory_quantity: number;
}

interface EtihadFiltersControlsProps {
  minSeats: number;
  maxSeats: number;
  itineraries: Itinerary[];
  segmentMap: Record<string, any>;
}

const PAGE_SIZE = 10;

export default function EtihadFiltersControls({
  minSeats,
  maxSeats,
  itineraries,
  segmentMap,
}: EtihadFiltersControlsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedFrom = searchParams.get('from') ? searchParams.get('from')!.split(',').filter(Boolean) : [];
  const selectedTo = searchParams.get('to') ? searchParams.get('to')!.split(',').filter(Boolean) : [];
  const selectedDates = searchParams.get('date') ? searchParams.get('date')!.split(',').filter(Boolean) : [];
  const selectedSeats = searchParams.get('seats') ? parseInt(searchParams.get('seats')!, 10) : 1;
  const sort = searchParams.get('sort') || 'points';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const showAll = searchParams.get('showAll') === '1';

  // Add expand/collapse state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Set loading state on mount and when searchParams changes
  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timeout);
  }, [searchParams]);

  // Filtering logic
  const filtered = useMemo(() => {
    let data = itineraries;
    if (!showAll) {
      data = data.filter(
        (it) => it.points < 125000 && it.segment_ids.every((id) => id.startsWith('EY'))
      );
    }
    if (selectedFrom.length) data = data.filter((it) => selectedFrom.includes(it.from_airport));
    if (selectedTo.length) data = data.filter((it) => selectedTo.includes(it.to_airport));
    if (selectedDates.length) data = data.filter((it) => selectedDates.includes(it.depart.slice(0, 10)));
    if (selectedSeats) data = data.filter((it) => it.inventory_quantity >= selectedSeats);
    return data;
  }, [itineraries, showAll, selectedFrom, selectedTo, selectedDates, selectedSeats]);

  // Sorting logic
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === 'points') {
        if (a.points !== b.points) return a.points - b.points;
      } else if (sort === 'duration') {
        if (a.duration !== b.duration) return a.duration - b.duration;
      } else if (sort === 'depart') {
        if (a.depart !== b.depart) return new Date(a.depart).getTime() - new Date(b.depart).getTime();
      }
      return new Date(a.depart).getTime() - new Date(b.depart).getTime();
    });
  }, [filtered, sort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Fetch city names for all IATA codes in paged segments
  const [iataToCity, setIataToCity] = useState<Record<string, string>>({});
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  useEffect(() => {
    const allIatas = new Set<string>();
    paged.forEach(itinerary => {
      allIatas.add(itinerary.from_airport);
      allIatas.add(itinerary.to_airport);
      itinerary.connections.forEach(conn => allIatas.add(conn));
      itinerary.segment_ids.forEach(segId => {
        const seg = segmentMap[segId];
        if (seg) {
          allIatas.add(seg.from_airport);
          allIatas.add(seg.to_airport);
        }
      });
    });
    if (allIatas.size === 0) return;
    setIsLoadingCities(true);
    const fetchCities = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('airports')
          .select('iata, city_name')
          .in('iata', Array.from(allIatas));
        if (error) throw error;
        const map: Record<string, string> = {};
        data?.forEach((row: { iata: string; city_name: string }) => {
          map[row.iata] = row.city_name;
        });
        setIataToCity(map);
      } catch (err) {
        setIataToCity({});
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, [paged, segmentMap]);

  // Compute filter options from filtered results
  const fromOptions = useMemo(() => Array.from(new Set(filtered.map(it => it.from_airport))).sort(), [filtered]);
  const toOptions = useMemo(() => Array.from(new Set(filtered.map(it => it.to_airport))).sort(), [filtered]);
  const dateOptions = useMemo(() => Array.from(new Set(filtered.map(it => it.depart.slice(0, 10)))).sort(), [filtered]);

  // Handlers
  function handleFilterChange({ from, to, dates, seats }: { from: string[]; to: string[]; dates: string[]; seats: number }) {
    setIsLoading(true);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (from.length) params.set('from', from.join(',')); else params.delete('from');
      if (to.length) params.set('to', to.join(',')); else params.delete('to');
      if (dates.length) params.set('date', dates.join(',')); else params.delete('date');
      if (seats) params.set('seats', String(seats)); else params.delete('seats');
      params.set('page', '1');
      router.replace('?' + params.toString());
      setIsLoading(false);
    });
  }
  function handleSortChange(val: string) {
    setIsLoading(true);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', val);
      params.set('page', '1');
      router.replace('?' + params.toString());
      setIsLoading(false);
    });
  }
  function handlePageChange(newPage: number) {
    setIsLoading(true);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(newPage));
      router.replace('?' + params.toString());
      setIsLoading(false);
    });
  }
  function handleShowAllChange(val: boolean) {
    setIsLoading(true);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set('showAll', '1'); else params.delete('showAll');
      params.set('page', '1');
      router.replace('?' + params.toString());
      setIsLoading(false);
    });
  }
  function handleExpandToggle(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <>
      <EtihadFilters
        fromOptions={fromOptions}
        toOptions={toOptions}
        dateOptions={dateOptions}
        minSeats={minSeats}
        maxSeats={maxSeats}
        selectedFrom={selectedFrom}
        selectedTo={selectedTo}
        selectedDates={selectedDates}
        selectedSeats={selectedSeats}
        onChange={handleFilterChange}
      />
      <EtihadControls />
      {(isLoading || isPending) && (
        <div className="flex items-center gap-2 text-muted-foreground justify-center my-6">
          <Loader2 className="animate-spin h-5 w-5" />
          <span>Loading results...</span>
        </div>
      )}
      <div className="flex flex-col gap-4 mt-4">
        {!isLoading && !isPending && paged.map((itinerary) => {
          const segments = itinerary.segment_ids.map((id) => segmentMap[id]).filter(Boolean);
          return (
            <EtihadItineraryCard
              key={itinerary.id}
              itinerary={itinerary}
              segments={segments}
              iataToCity={iataToCity}
              isLoadingCities={isLoadingCities}
              expanded={expandedId === itinerary.id}
              onToggle={() => handleExpandToggle(itinerary.id)}
            />
          );
        })}
      </div>
      <EtihadPagination
        currentPage={page - 1}
        totalPages={totalPages}
        sort={sort}
        showAll={showAll}
      />
    </>
  );
} 