import { Card, CardContent } from '@/components/ui/card';
import { notFound, redirect } from 'next/navigation';
import { format, toZonedTime } from 'date-fns-tz';
import { getAirportTimezone } from '@/lib/airport-tz-map';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Pagination } from '@/components/ui/pagination';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { parseISO } from 'date-fns';

// Force this page to be dynamic
export const dynamic = 'force-dynamic';

// Dynamic imports for heavy components to reduce initial bundle size
const EtihadItineraryCard = dynamic(
  () => import('@/components/jetblue/etihad/etihad-itinerary-card'),
  {
    loading: () => <div className="animate-pulse h-24 bg-gray-200 rounded-lg" />,
    ssr: true
  }
);

const EtihadFiltersControls = dynamic(
  () => import('@/components/jetblue/etihad/etihad-filters-controls'),
  {
    loading: () => <div className="animate-pulse h-16 bg-gray-200 rounded-lg" />,
    ssr: true
  }
);

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

interface Segment {
  id: string;
  from_airport: string;
  to_airport: string;
  aircraft: string;
  depart: string;
  arrive: string;
  flightno: string;
  duration: number;
  layover: number;
  bookingclass: string;
  cabinclass: string;
  operating_airline_code: string;
  distance: number;
}

function formatIsoTime(iso: string, iata: string) {
  const tz = getAirportTimezone(iata);
  if (!tz) return iso.slice(11, 16);
  const zoned = toZonedTime(iso, tz);
  return format(zoned, 'HH:mm');
}

function getDayDiff(depIso: string, depIata: string, arrIso: string, arrIata: string) {
  const depTz = getAirportTimezone(depIata);
  const arrTz = getAirportTimezone(arrIata);
  if (!depTz || !arrTz) return 0;
  const dep = toZonedTime(depIso, depTz);
  const arr = toZonedTime(arrIso, arrTz);
  const diff = (arr.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildPath(from: string, connections: string[], to: string) {
  return [from, ...connections, to].join('-');
}

const PAGE_SIZE = 10;

async function getItinerariesAndSegments(): Promise<Array<{ itinerary: Itinerary; segments: Segment[] }>> {
  const supabase = (await import('@/lib/supabase-browser')).createSupabaseBrowserClient();
  const { data: itineraries, error } = await supabase
    .from('itinerary')
    .select('*');
  if (error || !itineraries) return [];
  // Fetch all segments for all itineraries
  const allSegmentIds = Array.from(new Set(itineraries.flatMap((it: Itinerary) => it.segment_ids)));
  const { data: segments, error: segErr } = await supabase
    .from('segments')
    .select('*')
    .in('id', allSegmentIds);
  if (segErr || !segments) return [];
  const segmentMap: Record<string, Segment> = {};
  for (const seg of segments) segmentMap[seg.id] = seg;
  return itineraries.map((it: Itinerary) => ({
    itinerary: it,
    segments: it.segment_ids.map((id) => segmentMap[id]).filter(Boolean),
  }));
}

const EtihadControls = dynamic(() => import('@/components/jetblue/etihad/etihad-controls'), { ssr: false });
const EtihadPagination = dynamic(() => import('@/components/jetblue/etihad/etihad-pagination'), { ssr: false });
const EtihadFilters = dynamic(() => import('@/components/jetblue/etihad/etihad-filters'), { ssr: false });

export default async function EtihadPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  // Authentication and authorization check
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }

  // Check user role
  const supabase = createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile || (profile.role !== 'Owner' && profile.role !== 'Pro')) {
    redirect('/auth');
  }

  const { data, error: dataError } = await supabase
    .from('itinerary')
    .select('*');
  if (dataError || !data) return notFound();

  // Fetch all segments referenced by these itineraries
  const allSegmentIds = Array.from(new Set(data.flatMap((it: Itinerary) => it.segment_ids)));
  const { data: segmentsData, error: segErr } = await supabase
    .from('segments')
    .select('*')
    .in('id', allSegmentIds);
  if (segErr || !segmentsData) return notFound();
  const segmentMap = Object.fromEntries(segmentsData.map(seg => [seg.id, seg]));

  // Extract filter options from data
  const seatsArr = data.map((it: Itinerary) => it.inventory_quantity ?? 1);
  const minSeats = Math.min(...seatsArr);
  const maxSeats = Math.max(...seatsArr);

  // Render only the Client Component wrapper, passing options
  return (
    <div className="max-w-[1000px] mx-auto px-2 py-4">
      <EtihadFiltersControls
        minSeats={minSeats}
        maxSeats={maxSeats}
        itineraries={data}
        segmentMap={segmentMap}
      />
    </div>
  );
} 