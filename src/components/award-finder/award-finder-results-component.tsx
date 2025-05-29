import { Card, CardContent } from '@/components/ui/card';
import type { AwardFinderResults, Flight } from '@/types/award-finder-results';
import React from 'react';
import Image from 'next/image';
import { Progress } from '../ui/progress';
import { ChevronDown, ChevronUp, X, Check, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAirlineLogoSrc } from '@/lib/utils';

interface AwardFinderResultsProps {
  results: AwardFinderResults;
}

const formatTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getDayDiff = (baseDate: string, compareIso: string) => {
  // baseDate: 'YYYY-MM-DD', compareIso: ISO string
  const base = new Date(baseDate + 'T00:00:00Z');
  const compare = new Date(compareIso);
  // Calculate UTC day difference
  const diff = Math.floor((compare.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

const getTotalDuration = (flights: Flight[]) => {
  let total = 0;
  for (let i = 0; i < flights.length; i++) {
    total += flights[i].TotalDuration;
    if (i > 0) {
      const prevArrive = new Date(flights[i - 1].ArrivesAt).getTime();
      const currDepart = new Date(flights[i].DepartsAt).getTime();
      const layover = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
      total += layover;
    }
  }
  return total;
};

const getClassPercentages = (flights: Flight[]) => {
  const totalDuration = flights.reduce((sum, f) => sum + f.TotalDuration, 0);
  // Y: 100% if all flights have YCount > 0, else 0%
  const y = flights.every(f => f.YCount > 0) ? 100 : 0;

  // Helper to check if any flight has a higher class
  const hasHigher = (classKey: 'WCount' | 'JCount' | 'FCount', higherKeys: string[]) =>
    flights.some(f => higherKeys.some(hk => (f as any)[hk] > 0));

  // W: at least 1 WCount > 0, and all flights have at most W (no J or F)
  let w = 0;
  if (
    flights.some(f => f.WCount > 0) &&
    !hasHigher('WCount', ['JCount', 'FCount'])
  ) {
    const wDuration = flights.filter(f => f.WCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    w = Math.round((wDuration / totalDuration) * 100);
  }

  // J: at least 1 JCount > 0, and all flights have at most J (no F)
  let j = 0;
  if (
    flights.some(f => f.JCount > 0) &&
    !hasHigher('JCount', ['FCount'])
  ) {
    const jDuration = flights.filter(f => f.JCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    j = Math.round((jDuration / totalDuration) * 100);
  }

  // F: at least 1 FCount > 0
  let f = 0;
  if (flights.some(f => f.FCount > 0)) {
    const fDuration = flights.filter(f => f.FCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    f = Math.round((fDuration / totalDuration) * 100);
  }

  return { y, w, j, f };
};

const getAirlineCode = (flightNumber: string) => flightNumber.slice(0, 2).toUpperCase();

const classBarColors: Record<string, string> = {
  Y: 'bg-[#E8E1F2]',
  W: 'bg-[#B8A4CC]',
  J: 'bg-[#F3CD87]',
  F: 'bg-[#D88A3F]',
};

interface ClassBarProps {
  label: string;
  percent: number;
}

const ClassBar: React.FC<ClassBarProps> = ({ label, percent }) => (
  <div className="flex items-center min-w-[60px] gap-1">
    <div className="relative w-16 h-3">
      <div className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-200 w-full bg-muted`} />
      <div
        className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-200 ${classBarColors[label]}`}
        style={{ width: `${percent}%` }}
      />
      <span
        className={`absolute left-1 top-0 text-[10px] font-bold select-none ${percent === 0 ? 'text-black dark:text-white' : 'text-gray-700 dark:text-black'}`}
        style={{ lineHeight: '0.75rem' }}
      >
        {label}
      </span>
    </div>
    <span className="text-xs font-mono w-7 text-right">{percent}%</span>
  </div>
);

// Add a helper for layover duration formatting
const formatLayoverDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const AwardFinderResultsComponent: React.FC<AwardFinderResultsProps> = ({ results }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [iataToCity, setIataToCity] = useState<Record<string, string>>({});
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [reliability, setReliability] = useState<Record<string, number>>({});

  // Collect all unique IATA codes from all routes (not just layovers)
  useEffect(() => {
    // Collect all unique IATA codes from all routes (not just layovers)
    const allIatas = new Set<string>();
    Object.entries(results.itineraries).forEach(([route, dates]) => {
      const segs = route.split('-');
      segs.forEach(iata => { if (iata) allIatas.add(iata); });
      Object.values(dates).forEach(itineraries => {
        itineraries.forEach(itinerary => {
          // For each layover (i > 0), add segs[i] as layover IATA (already included above)
        });
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
        // Supabase: up to 1000 in 'in' filter
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
  }, [results]);

  // Fetch reliability table (code, min_count)
  useEffect(() => {
    const fetchReliability = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('reliability')
          .select('code, min_count');
        if (error) return;
        const map: Record<string, number> = {};
        data?.forEach((row: { code: string; min_count: number }) => {
          map[row.code] = row.min_count;
        });
        setReliability(map);
      } catch {}
    };
    fetchReliability();
  }, []);

  const handleToggle = (key: string) => {
    setExpanded(expanded === key ? null : key);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <TooltipProvider>
      {Object.entries(results.itineraries).map(([route, dates]) =>
        Object.entries(dates).map(([date, itineraries]) =>
          itineraries.map((itinerary, idx) => {
            const flights: Flight[] = itinerary.map(id => results.flights[id]);
            const firstFlight = flights[0];
            const lastFlight = flights[flights.length - 1];
            const dayDiff = getDayDiff(date, lastFlight.ArrivesAt);
            const totalDuration = getTotalDuration(flights);
            const { y, w, j, f } = getClassPercentages(flights);
            const cardKey = `${route}-${date}-${idx}`;
            const isOpen = expanded === cardKey;
            // Airline logo helpers
            const airlineLogoSrcs = flights.map(f => useAirlineLogoSrc(getAirlineCode(f.FlightNumbers)));
            return (
              <Card key={cardKey} className="rounded-xl border bg-card shadow transition-all cursor-pointer">
                <div onClick={() => handleToggle(cardKey)} className="flex items-center justify-between">
                  <CardContent className="flex flex-col md:flex-row items-center justify-between py-4 gap-2 p-4 w-full">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                      <span className="font-semibold text-lg text-primary">{route}</span>
                      <span className="text-muted-foreground text-sm md:ml-4">{date}</span>
                    </div>
                    <div className="flex flex-row items-center justify-end w-full gap-6">
                      <div className="flex items-center gap-6">
                        <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap">{formatDuration(totalDuration)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatTime(firstFlight.DepartsAt)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm font-medium">
                            {formatTime(lastFlight.ArrivesAt)}
                            {dayDiff > 0 && <span className="text-xs text-muted-foreground ml-1">(+{dayDiff})</span>}
                          </span>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="h-5 w-5 ml-2" /> : <ChevronDown className="h-5 w-5 ml-2" />}
                    </div>
                  </CardContent>
                </div>
                <div className="px-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
                  <div className="flex flex-wrap gap-2 items-center">
                    {flights.map((f, i) => {
                      const code = getAirlineCode(f.FlightNumbers);
                      const logoSrc = airlineLogoSrcs[i];
                      return (
                        <span key={f.FlightNumbers + i} className="flex items-center gap-1">
                          <Image
                            src={logoSrc}
                            alt={code}
                            width={24}
                            height={24}
                            className="inline-block align-middle rounded-md"
                            style={{ objectFit: 'contain' }}
                          />
                          <span className="font-mono">{f.FlightNumbers}</span>
                          {i < flights.length - 1 && <span className="mx-1 text-muted-foreground">/</span>}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-4 items-center">
                    <ClassBar label="Y" percent={y} />
                    <ClassBar label="W" percent={w} />
                    <ClassBar label="J" percent={j} />
                    <ClassBar label="F" percent={f} />
                  </div>
                </div>
                {isOpen && (
                  <>
                    <div className="w-full flex justify-center my-2">
                      <div className="h-px w-full bg-muted" />
                    </div>
                    <div className="px-6 pb-4">
                      <div className="flex flex-col gap-3">
                        {flights.map((f, i) => {
                          // Find segment path: e.g., SEA-AMS
                          const segs = route.split('-');
                          let segment = '';
                          if (i === 0) {
                            const fromIata = segs[0];
                            const toIata = segs[1] || '';
                            const fromCity = iataToCity[fromIata] || fromIata;
                            const toCity = iataToCity[toIata] || toIata;
                            segment = `${fromCity} (${fromIata}) → ${toCity} (${toIata})`;
                          } else {
                            const fromIata = segs[i];
                            const toIata = segs[i + 1] || '';
                            const fromCity = iataToCity[fromIata] || fromIata;
                            const toCity = iataToCity[toIata] || toIata;
                            segment = `${fromCity} (${fromIata}) → ${toCity} (${toIata})`;
                          }
                          const code = getAirlineCode(f.FlightNumbers);
                          // Layover calculation
                          let layover = null;
                          if (i > 0) {
                            const prev = flights[i - 1];
                            const prevArrive = new Date(prev.ArrivesAt).getTime();
                            const currDepart = new Date(f.DepartsAt).getTime();
                            const diffMin = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
                            if (diffMin > 0) {
                              const at = segs[i];
                              const cityName = iataToCity[at] || at;
                              layover = (
                                <div className="flex items-center w-full my-2">
                                  <div className="flex-1 h-px bg-muted" />
                                  <span className="mx-3 text-xs text-muted-foreground font-mono">
                                    Layover at {cityName} ({at}) for {formatLayoverDuration(diffMin)}
                                    {isLoadingCities && <span className="ml-2 animate-pulse text-muted-foreground">…</span>}
                                    {cityError && <span className="ml-2 text-red-500">(city error)</span>}
                                  </span>
                                  <div className="flex-1 h-px bg-muted" />
                                </div>
                              );
                            }
                          }
                          return (
                            <React.Fragment key={f.FlightNumbers + i}>
                              {i > 0 && layover}
                              <div className="flex flex-col gap-0.5 py-2">
                                {/* First line */}
                                <div className="flex flex-row items-center justify-between w-full">
                                  <div className="flex items-center gap-6">
                                    <span className="font-semibold text-primary whitespace-nowrap">{segment}</span>
                                    <span className="text-sm font-mono text-muted-foreground font-bold">{formatDuration(f.TotalDuration)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{formatTime(f.DepartsAt)}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="text-sm font-medium">{formatTime(f.ArrivesAt)}</span>
                                  </div>
                                </div>
                                {/* Second line */}
                                <div className="flex flex-row items-center justify-between w-full mt-1">
                                  <div className="flex items-center gap-2">
                                    <Image
                                      src={airlineLogoSrcs[i]}
                                      alt={code}
                                      width={20}
                                      height={20}
                                      className="inline-block align-middle rounded-md"
                                      style={{ objectFit: 'contain' }}
                                    />
                                    <span className="font-mono text-sm">{f.FlightNumbers}</span>
                                    <span className="text-xs text-muted-foreground ml-1">({f.Aircraft})</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Class icon logic with reliability */}
                                    {(['Y', 'W', 'J', 'F'] as const).map((cls, idx) => {
                                      const count =
                                        cls === 'Y' ? f.YCount :
                                        cls === 'W' ? f.WCount :
                                        cls === 'J' ? f.JCount :
                                        f.FCount;
                                      const code = getAirlineCode(f.FlightNumbers);
                                      const minCount = reliability[code] ?? 1;
                                      let icon = null;
                                      if (!count) {
                                        icon = <X className="text-red-400 h-4 w-4" />;
                                      } else if (count < minCount) {
                                        icon = (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span><AlertTriangle className="text-yellow-500 h-4 w-4" /></span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs text-xs">
                                            This flight likely has dynamic pricing and may not be available on partner programs.
                                            </TooltipContent>
                                          </Tooltip>
                                        );
                                      } else {
                                        icon = <Check className="text-green-600 h-4 w-4" />;
                                      }
                                      return (
                                        <span key={cls} className="flex items-center gap-1 text-xs">
                                          {cls} {icon}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </Card>
            );
          })
        )
      )}
      </TooltipProvider>
    </div>
  );
};

export default AwardFinderResultsComponent; 