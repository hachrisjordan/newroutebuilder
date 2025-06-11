import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import FlightCard from './flight-card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getAirlineLogoSrc, getTotalDuration } from '@/lib/utils';
import { useTheme } from 'next-themes';

/**
 * Props for LiveSearchResultsCards
 */
interface LiveSearchResultsCardsProps {
  itineraries: Array<{
    from: string;
    to: string;
    connections: string[];
    depart: string;
    arrive: string;
    duration: number;
    bundles: Array<{
      class: string;
      points: string;
      fareTax: string;
    }>;
    segments: Array<{
      from: string;
      to: string;
      aircraft: string;
      stops: number;
      depart: string;
      arrive: string;
      flightnumber: string;
      duration: number;
      layover?: number;
      distance: number;
    }>;
  }>;
}

/**
 * Renders live search itinerary and flight cards using award finder card style, fetching IATA-to-city mapping from Supabase.
 */
const LiveSearchResultsCards: React.FC<LiveSearchResultsCardsProps> = ({ itineraries }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [iataToCity, setIataToCity] = useState<Record<string, string>>({});
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [aircraftMap, setAircraftMap] = useState<Record<string, string>>({});

  // Collect all unique IATA codes from all itineraries/segments
  useEffect(() => {
    const allIatas = new Set<string>();
    itineraries.forEach(itin => {
      allIatas.add(itin.from);
      allIatas.add(itin.to);
      itin.connections.forEach(conn => allIatas.add(conn));
      itin.segments.forEach(seg => {
        allIatas.add(seg.from);
        allIatas.add(seg.to);
      });
    });
    if (allIatas.size === 0) {
      setIataToCity({});
      return;
    }
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCityError(null);
      try {
        const supabase = createSupabaseBrowserClient();
        const iataList = Array.from(allIatas);
        const { data, error } = await supabase
          .from('airports')
          .select('iata, city_name')
          .in('iata', iataList);
        if (error) throw error;
        const map: Record<string, string> = {};
        data?.forEach((row: { iata: string; city_name: string }) => {
          map[row.iata] = row.city_name;
        });
        setIataToCity(map);
      } catch (err: any) {
        setCityError(err.message || 'Failed to load city names');
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, [itineraries]);

  useEffect(() => {
    // Fetch aircraft table
    const fetchAircraft = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('aircraft')
          .select('iata_code, name');
        if (error) throw error;
        const map: Record<string, string> = {};
        data?.forEach((row: { iata_code: string; name: string }) => {
          map[row.iata_code] = row.name;
        });
        setAircraftMap(map);
      } catch (err) {
        // ignore error, fallback to code
      }
    };
    fetchAircraft();
  }, [itineraries]);

  const handleToggle = (idx: number) => {
    setExpanded(expanded === idx ? null : idx);
  };

  // Helper: format duration in h m
  function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  // Helper: format ISO time as HH:mm
  function formatIsoTime(iso: string) {
    const [, time] = iso.split('T');
    return time ? time.slice(0, 5) : '';
  }

  // Helper: get day diff from itinerary start
  function getDayDiffFromItinerary(itinDepart: string, iso: string) {
    const itinerary = new Date(itinDepart);
    const flightDate = new Date(iso);
    return Math.floor((flightDate.getTime() - itinerary.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Helper: build route string
  function buildRoute(itin: LiveSearchResultsCardsProps['itineraries'][number]) {
    return [itin.from, ...itin.connections, itin.to].join('-');
  }

  // Helper to determine if a color is light or dark
  function getContrastTextColor(bgColor: string): string {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#222' : '#fff';
  }

  const classBarColors: Record<string, string> = {
    Y: '#E8E1F2', // lavender
    W: '#B8A4CC', // purple
    J: '#F3CD87', // gold
    F: '#D88A3F', // orange
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1000px] mx-auto">
      <TooltipProvider>
        {itineraries.map((itin, idx) => {
          const route = buildRoute(itin);
          const totalDuration = itin.duration;
          const cardKey = `${route}-${itin.depart}-${idx}`;
          const isOpen = expanded === idx;
          const firstSeg = itin.segments[0];
          const lastSeg = itin.segments[itin.segments.length - 1];
          return (
            <Card key={cardKey} className="rounded-xl border bg-card shadow transition-all cursor-pointer">
              <div onClick={() => handleToggle(idx)} className="flex items-center justify-between">
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                    <span className="font-semibold text-lg text-primary">{route}</span>
                    <span className="text-muted-foreground text-sm md:ml-4">{itin.depart.slice(0, 10)}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-6 mt-2 md:mt-0 ml-auto">
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap">{formatDuration(totalDuration)}</span>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-sm font-medium">{formatIsoTime(firstSeg.depart)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm font-medium">{formatIsoTime(lastSeg.arrive)}</span>
                        {(() => {
                          const arrDiff = getDayDiffFromItinerary(itin.depart, lastSeg.arrive);
                          return arrDiff > 0 ? (
                            <span className="text-xs text-muted-foreground ml-1">(+{arrDiff})</span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <span className="self-end md:self-center">
                      {isOpen ? <ChevronUp className="h-5 w-5 ml-2" /> : <ChevronDown className="h-5 w-5 ml-2" />}
                    </span>
                  </div>
                </CardContent>
              </div>
              <div className="px-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
                <div className="flex flex-wrap gap-2 items-center">
                  {itin.segments.map((seg, i) => {
                    const code = seg.flightnumber.slice(0, 2).toUpperCase();
                    const logoSrc = getAirlineLogoSrc(code, isDark);
                    // For each segment, get aircraft name
                    const aircraftName = aircraftMap[seg.aircraft] || seg.aircraft;
                    return (
                      <span key={seg.flightnumber + i} className="flex items-center gap-1">
                        <Image
                          src={logoSrc}
                          alt={code}
                          width={24}
                          height={24}
                          className="inline-block align-middle rounded-md"
                          style={{ objectFit: 'contain' }}
                        />
                        <span className="font-mono">{seg.flightnumber}</span>
                        {i < itin.segments.length - 1 && <span className="mx-1 text-muted-foreground">/</span>}
                      </span>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {itin.bundles.map((b, i) => {
                    const bg = classBarColors[b.class] || '#E8E1F2';
                    const color = getContrastTextColor(bg);
                    return (
                      <span
                        key={b.class + i}
                        className={
                          'inline-flex items-center px-2 py-0.5 rounded font-mono text-sm font-bold'
                        }
                        style={{ background: bg, color }}
                      >
                        <span className="mr-1">{b.class}:</span>
                        <span className="tabular-nums mr-1">{Number(b.points).toLocaleString()}</span>
                        <span className="ml-1 text-xs font-normal opacity-80">+${Number(b.fareTax).toFixed(2)}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              {isOpen && (
                <>
                  <div className="w-full flex justify-center my-2">
                    <div className="h-px w-full bg-muted" />
                  </div>
                  <div className="px-6 pb-4">
                    <div className="flex flex-col gap-3">
                      {itin.segments.map((seg, i) => {
                        // Segment path: e.g., Chicago (ORD) → Tokyo (HND)
                        const fromCity = iataToCity[seg.from] || seg.from;
                        const toCity = iataToCity[seg.to] || seg.to;
                        const segment = `${fromCity} (${seg.from}) → ${toCity} (${seg.to})`;
                        // Layover calculation
                        let layover = null;
                        if (i > 0) {
                          const prev = itin.segments[i - 1];
                          const prevArrive = new Date(prev.arrive).getTime();
                          const currDepart = new Date(seg.depart).getTime();
                          const diffMin = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
                          if (diffMin > 0) {
                            const at = seg.from;
                            const cityName = iataToCity[at] || at;
                            layover = (
                              <div className="flex items-center w-full my-2">
                                <div className="flex-1 h-px bg-muted" />
                                <span className="mx-3 text-xs text-muted-foreground font-mono">
                                  Layover at {cityName} ({at}) for {formatDuration(diffMin)}
                                  {isLoadingCities && <span className="ml-2 animate-pulse text-muted-foreground">…</span>}
                                  {cityError && <span className="ml-2 text-red-500">(city error)</span>}
                                </span>
                                <div className="flex-1 h-px bg-muted" />
                              </div>
                            );
                          }
                        }
                        // Day difference from itinerary start
                        const depDiff = getDayDiffFromItinerary(itin.depart, seg.depart);
                        const arrDiff = getDayDiffFromItinerary(itin.depart, seg.arrive);
                        // Fake reliability: always reliable
                        const reliabilityMap = { [seg.flightnumber.slice(0, 2).toUpperCase()]: { min_count: 1 } };
                        // Get aircraft name for this segment
                        const aircraftName = aircraftMap[seg.aircraft] || seg.aircraft;
                        // Fake flight object for FlightCard
                        const flight = {
                          FlightNumbers: seg.flightnumber,
                          TotalDuration: seg.duration,
                          Aircraft: aircraftName,
                          DepartsAt: seg.depart,
                          ArrivesAt: seg.arrive,
                          YCount: 1,
                          WCount: 1,
                          JCount: 1,
                          FCount: 1,
                        };
                        return (
                          <FlightCard
                            key={seg.flightnumber + i}
                            flight={flight}
                            segment={segment}
                            depDiff={depDiff}
                            arrDiff={arrDiff}
                            code={seg.flightnumber.slice(0, 2).toUpperCase()}
                            isDark={isDark}
                            iataToCity={iataToCity}
                            reliability={reliabilityMap}
                            layover={layover}
                            cityError={cityError}
                            isLoadingCities={isLoadingCities}
                          />
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </TooltipProvider>
    </div>
  );
};

export default LiveSearchResultsCards; 