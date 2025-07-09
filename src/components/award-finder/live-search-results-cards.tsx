import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import FlightCard from './flight-card';
import { TooltipTouch } from '@/components/ui/tooltip-touch';
import { getAirlineLogoSrc, getTotalDuration } from '@/lib/utils';
import { useTheme } from 'next-themes';
import LiveSearchFlightCard from './live-search-flight-card';

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
      bundleClasses?: Array<Record<string, string>>;
    }>;
  }>;
  iataToCity: Record<string, string>;
  aircraftMap: Record<string, string>;
  isLoadingCities?: boolean;
  cityError?: string | null;
  currency?: string; // Added currency prop
}

/**
 * Renders live search itinerary and flight cards using award finder card style, fetching IATA-to-city mapping from Supabase.
 */
const LiveSearchResultsCards: React.FC<LiveSearchResultsCardsProps> = ({ itineraries, iataToCity, aircraftMap, isLoadingCities, cityError, currency }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

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

  // Helper: get day diff from itinerary start (calendar day, local time, no timezone conversion)
  function getDayDiffFromItinerary(itinDepart: string, iso: string) {
    // Extract YYYY-MM-DD from both
    const itinDate = itinDepart.slice(0, 10);
    const segDate = iso.slice(0, 10);
    const itin = new Date(itinDate);
    const seg = new Date(segDate);
    return Math.floor((seg.getTime() - itin.getTime()) / (1000 * 60 * 60 * 24));
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

  const classNames: Record<string, string> = {
    Y: 'Economy',
    W: 'Premium Economy',
    J: 'Business',
    F: 'First',
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1000px] mx-auto">
      {itineraries.map((itin, idx) => {
        const route = buildRoute(itin);
        const totalDuration = itin.duration;
        const cardKey = `${route}-${itin.depart}-${idx}`;
        const isOpen = expanded === idx;
        const firstSeg = itin.segments[0];
        const lastSeg = itin.segments[itin.segments.length - 1];
        // Get program code if present
        const program = (itin as any).__program;
        // Detect dark mode
        const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
        return (
          <Card key={cardKey} className="rounded-xl border bg-card shadow transition-all cursor-pointer relative">
            {/* Mobile: logo top right, absolute */}
            {program && (
              <div className={"absolute top-6 right-2 block md:hidden rounded" + (isDark ? " bg-white" : "")} style={isDark ? { padding: '4px', width: '75px', height: '30px' } : { width: '75px', height: '30px' }}>
                <Image
                  src={`/${program}_P.png`}
                  alt={`${program} logo`}
                  width={75}
                  height={30}
                  style={{ objectFit: 'contain' }}
                  unoptimized
                />
              </div>
            )}
            <div onClick={() => handleToggle(idx)} className="flex items-center justify-between">
              <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
                {/* Path/date/logo row: mobile = col, desktop = row */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2 w-full">
                    {/* Desktop: logo left of path/date */}
                    {program && (
                      <span
                        className={
                          'hidden md:flex items-center justify-center mr-4 rounded' +
                          (isDark ? ' bg-white' : '')
                        }
                        style={isDark ? { padding: '4px', width: '75px', height: '30px' } : { width: '75px', height: '30px' }}
                      >
                        <Image
                          src={`/${program}_P.png`}
                          alt={`${program} logo`}
                          width={75}
                          height={30}
                          style={{ objectFit: 'contain' }}
                          unoptimized
                        />
                      </span>
                    )}
                    <span className="font-semibold text-lg text-primary">{route}</span>
                    <span className="text-muted-foreground text-sm md:ml-4">{itin.depart.slice(0, 10)}</span>
                  </div>
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
                          <span className="text-xs text-muted-foreground">(+{arrDiff})</span>
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
                  let aircraftName = aircraftMap[seg.aircraft] || seg.aircraft;
                  if (typeof aircraftName === 'string') aircraftName = aircraftName.trimEnd();
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
                {itin.bundles
                  .slice()
                  .sort((a, b) => {
                    const order = ['Y', 'W', 'J', 'F'];
                    return order.indexOf(a.class) - order.indexOf(b.class);
                  })
                  .map((b, i) => {
                    const bg = classBarColors[b.class] || '#E8E1F2';
                    const color = getContrastTextColor(bg);
                    return (
                      <div key={b.class + i} className="flex flex-col items-center">
                        <span
                          className={
                            'inline-flex items-center px-2 py-0.5 rounded font-mono text-sm font-bold'
                          }
                          style={{ background: bg, color }}
                        >
                          <span className="mr-1">{b.class}:</span>
                          <span className="tabular-nums mr-1">{Number(b.points).toLocaleString()}</span>
                          <span className="ml-1 text-xs font-normal opacity-80">
                            +{currency && typeof currency === 'string' && currency.trim() ? currency.trim() : 'USD'} {Number(b.fareTax).toFixed(2)}
                          </span>
                        </span>
                        {/* Mixed-cabin bar logic */}
                        {(() => {
                          // Gather segment class for this bundle
                          const segments = itin.segments;
                          const totalDistance = segments.reduce((sum, seg) => sum + (seg.distance || 0), 0) || 1;
                          // For each segment, get the class for this bundle
                          const segClasses = segments.map((seg) => {
                            let segClass = b.class;
                            if (Array.isArray(seg.bundleClasses) && seg.bundleClasses.length > 0) {
                              // Look for a key matching the bundle, e.g., 'WClass' for W
                              const key = b.class + 'Class';
                              const entry = seg.bundleClasses.find((obj: Record<string, string>) => key in obj);
                              if (entry && typeof entry[key] === 'string' && ['Y','W','J','F'].includes(entry[key])) {
                                segClass = entry[key];
                              }
                            }
                            return { segClass, distance: seg.distance || 0 };
                          });
                          // Only render split bar if there are multiple unique classes
                          const uniqueClasses = Array.from(new Set(segClasses.map(sc => sc.segClass)));
                          const isMixed = uniqueClasses.length > 1;
                          if (!isMixed) {
                            return (
                              <div
                                className="w-full h-1 rounded-full mt-0.5"
                                style={{ background: bg }}
                              />
                            );
                          }
                          // Otherwise, render a flex row of colored segments
                          return (
                            <div className="w-full flex flex-row h-1 rounded-full mt-0.5 overflow-hidden">
                              {segClasses.map((sc, idx) => {
                                const segWidth = `${(sc.distance / totalDistance) * 100}%`;
                                const segColor = classBarColors[sc.segClass] || '#E8E1F2';
                                // Get segment path for tooltip
                                const seg = segments[idx];
                                const segPath = `${seg.from}-${seg.to}`;
                                const classLabel = classNames[sc.segClass] || sc.segClass;
                                return (
                                  <TooltipTouch key={idx} content={`${segPath}: ${classLabel}`}>
                                    <div
                                      style={{
                                        width: segWidth,
                                        background: segColor,
                                        borderRadius: '9999px',
                                        marginLeft: idx > 0 ? '1px' : 0,
                                        marginRight: idx < segClasses.length - 1 ? '1px' : 0,
                                        cursor: 'pointer',
                                      }}
                                    />
                                  </TooltipTouch>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
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
                                {isLoadingCities && <span className="ml-2 animate-pulse text-muted-foreground"></span>}
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
                      const code = seg.flightnumber.slice(0, 2).toUpperCase();
                      let aircraftName = aircraftMap[seg.aircraft] || seg.aircraft;
                      if (typeof aircraftName === 'string') aircraftName = aircraftName.trimEnd();
                      return (
                        <React.Fragment key={seg.flightnumber + i}>
                          {layover}
                          <LiveSearchFlightCard
                            segment={segment}
                            depTime={seg.depart}
                            arrTime={seg.arrive}
                            depDiff={depDiff}
                            arrDiff={arrDiff}
                            code={code}
                            flightNumber={seg.flightnumber}
                            aircraft={aircraftName}
                            isDark={isDark}
                            duration={seg.duration}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default LiveSearchResultsCards; 