import { Card, CardContent } from '@/components/ui/card';
import type { Flight } from '@/types/award-finder-results';
import React from 'react';
import Image from 'next/image';
import { Progress } from '../ui/progress';
import { ChevronDown, ChevronUp, X, Check, AlertTriangle, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import { getAirlineLogoSrc, getTotalDuration, getClassPercentages } from '@/lib/utils';
import FlightCard from './flight-card';
import { TooltipTouch } from '@/components/ui/tooltip-touch';
import ExpandFade from '../ui/expand-fade';

interface AwardFinderResultsFlatCard {
  route: string;
  date: string;
  itinerary: string[];
  flights: Record<string, Flight>;
}

interface AwardFinderResultsComponentProps {
  cards: Array<{ route: string; date: string; itinerary: string[] }>; // flat, ordered array
  flights: Record<string, Flight>;
  reliability: Record<string, { min_count: number; exemption?: string }>;
  minReliabilityPercent: number;
}

// Helper to parse ISO string as local time (ignore Z)
function parseLocalTime(iso: string): Date {
  return new Date(iso.replace(/Z$/, ''));
}

const formatTime = (iso: string) => {
  const date = parseLocalTime(iso);
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

function getLocalDayDiff(baseDate: string, iso: string): number {
  // baseDate: 'YYYY-MM-DD', iso: 'YYYY-MM-DDTHH:mm:ssZ'
  const base = new Date(baseDate);
  const compare = parseLocalTime(iso);
  // Use only the date part, ignore timezones
  const baseYMD = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
  const compareYMD = `${compare.getFullYear()}-${String(compare.getMonth()+1).padStart(2,'0')}-${String(compare.getDate()).padStart(2,'0')}`;
  const baseDateObj = new Date(baseYMD);
  const compareDateObj = new Date(compareYMD);
  return Math.floor((compareDateObj.getTime() - baseDateObj.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper to get local date string from ISO
function getFlightLocalDate(iso: string): string {
  return formatYMD(parseLocalTime(iso));
}

// Helper to format a Date as YYYY-MM-DD
function formatYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// Minimal, robust helpers for local date and day diff
function parseLocalDateFromIso(iso: string): string {
  // Remove Z, parse as local, and return YYYY-MM-DD
  const d = new Date(iso.replace(/Z$/, ''));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDayDiffFromItinerary(itineraryDate: string, iso: string): number {
  const itinerary = new Date(itineraryDate);
  const flightDate = new Date(parseLocalDateFromIso(iso));
  return Math.floor((flightDate.getTime() - itinerary.getTime()) / (1000 * 60 * 60 * 24));
}

function formatIsoTime(iso: string) {
  // Returns 'HH:mm' from ISO string, without local time conversion
  const [, time] = iso.split('T');
  return time ? time.slice(0, 5) : '';
}

const AwardFinderResultsComponent: React.FC<AwardFinderResultsComponentProps> = ({ cards, flights, reliability, minReliabilityPercent }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [iataToCity, setIataToCity] = useState<Record<string, string>>({});
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [allianceData, setAllianceData] = useState<Record<string, Array<{code: string, name: string, ffp: string}>>>({});
     const [allAirlines, setAllAirlines] = useState<Array<{code: string, name: string, ffp: string, bonus: string[], recommend: string[]}>>([]);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Collect all unique IATA codes from all cards
  useEffect(() => {
    const allIatas = new Set<string>();
    cards.forEach(({ route }) => {
      const segs = route.split('-');
      segs.forEach(iata => { if (iata) allIatas.add(iata); });
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
  }, [cards]);

  // Fetch all airline data for tooltips
  useEffect(() => {
    const fetchAirlineData = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
                 const { data, error } = await supabase
           .from('airlines')
           .select('code, name, alliance, ffp, bonus, recommend');
        
        if (error) throw error;
        
                 const allianceMap: Record<string, Array<{code: string, name: string, ffp: string}>> = {};
         const allAirlines: Array<{code: string, name: string, ffp: string, bonus: string[], recommend: string[]}> = [];
         
         data?.forEach((row: { code: string; name: string; alliance: string; ffp: string; bonus: string[]; recommend: string[] }) => {
          // For alliance data (only airlines with FFP)
          if (row.alliance && ['OW', 'SA', 'ST'].includes(row.alliance) && row.ffp) {
            if (!allianceMap[row.alliance]) {
              allianceMap[row.alliance] = [];
            }
            allianceMap[row.alliance].push({
              code: row.code,
              name: row.name,
              ffp: row.ffp
            });
          }
          
                     // For all airlines (including those without FFP for bonus checking)
           allAirlines.push({
             code: row.code,
             name: row.name,
             ffp: row.ffp,
             bonus: row.bonus || [],
             recommend: row.recommend || []
           });
        });
        
        setAllianceData(allianceMap);
        setAllAirlines(allAirlines);
      } catch (err: any) {
        console.error('Failed to fetch airline data:', err);
      }
    };
    
    fetchAirlineData();
  }, []);

  const handleToggle = (key: string) => {
    setExpanded(expanded === key ? null : key);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1000px] mx-auto">
      <TooltipProvider>
        {cards.map(({ route, date, itinerary }, idx) => {
          const flightsArr: Flight[] = itinerary.map(id => flights[id]).filter(Boolean);
          if (flightsArr.length === 0) return null;
          const firstFlight = flightsArr[0];
          const lastFlight = flightsArr[flightsArr.length - 1];
          const totalDuration = getTotalDuration(flightsArr);
          const { y, w, j, f } = getClassPercentages(flightsArr, reliability, minReliabilityPercent);
          const cardKey = `${route}-${date}-${idx}`;
          const isOpen = expanded === cardKey;
          return (
            <Card key={cardKey} className="rounded-xl border bg-card shadow transition-all">
              <div className="flex items-center justify-between">
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <div className="flex flex-col">
                          <span className="font-semibold text-lg text-primary">{route}</span>
                          {/* Route segment color lines */}
                                                     <div 
                             className="relative w-full min-h-[8px]"
                             ref={(el) => {
                               // Container ref for potential future use
                             }}
                           >
                                                         {(() => {
                               const segments = route.split('-');
                              
                              // Alliance definitions
                              const ALLIANCE = {
                                'OW': ['AS', 'AA', 'BA', 'CX', 'FJ', 'AY', 'IB', 'JL', 'QF', 'QR', 'AT', 'RJ', 'UL','WY','MH'],  // Oneworld
                                'SA': ['A3', 'AC', 'CA', 'AI', 'NZ', 'NH', 'NQ', 'EQ', 'OZ', 'OS', 'AV', 'SN', 'CM', 'OU', 'MS', 'ET', 'BR', 'LO', 'LH', 'CL', 'SQ', 'SA', 'LX', 'TP', 'TG', 'UA','TK'],  // Star Alliance
                                'ST': ['AR', 'AM', 'UX', 'AF', 'CI', 'MU', 'DL', 'GA', 'KQ', 'KL', 'KE', 'ME', 'SV', 'SK', 'RO', 'VN', 'VS', 'MF'],  // SkyTeam
                                'EY': ['EY'],
                                'EK': ['EK'],
                                'JX': ['JX'],
                                'B6': ['B6'],
                                'DE': ['DE'],
                                'GF': ['GF']
                              };
                              
                              // Helper function to get alliance for an airline code
                              const getAlliance = (code: string) => {
                                for (const [alliance, airlines] of Object.entries(ALLIANCE)) {
                                  if (airlines.includes(code)) {
                                    return alliance;
                                  }
                                }
                                return null;
                              };
                              
                              // Check which segments are unreliable (have cash legs)
                              const unreliableSegments = new Set<number>();
                              flightsArr.forEach((f, i) => {
                                const code = getAirlineCode(f.FlightNumbers);
                                const rel = reliability[code];
                                const min = rel?.min_count ?? 1;
                                const exemption = rel?.exemption || '';
                                const classCounts = [
                                  { cls: 'Y', count: f.YCount },
                                  { cls: 'W', count: f.WCount },
                                  { cls: 'J', count: f.JCount },
                                  { cls: 'F', count: f.FCount },
                                ];
                                const isUnreliable = !classCounts.some(({ cls, count }) => {
                                  const minCount = exemption.includes(cls) ? 1 : min;
                                  return count >= minCount;
                                });
                                if (isUnreliable) {
                                  unreliableSegments.add(i);
                                }
                              });
                              
                              // Group consecutive segments by alliance for non-unreliable segments
                              const lineGroups: Array<{start: number, end: number, alliance: string | null, isUnreliable: boolean}> = [];
                              let currentGroup: {start: number, end: number, alliance: string | null, isUnreliable: boolean} | null = null;
                              
                              
                              
                              segments.slice(0, -1).forEach((_, index) => {
                                const isUnreliable = unreliableSegments.has(index);
                                const flight = flightsArr[index];
                                const airlineCode = getAirlineCode(flight.FlightNumbers);
                                const alliance = isUnreliable ? null : getAlliance(airlineCode);
                                
                                
                                
                                if (currentGroup === null) {
                                                                     // Start new group
                                   currentGroup = { start: index, end: index, alliance, isUnreliable };
                                } else if (currentGroup.isUnreliable !== isUnreliable || 
                                         (currentGroup.isUnreliable === false && currentGroup.alliance !== alliance)) {
                                                                     // End current group and start new one
                                   lineGroups.push(currentGroup);
                                   currentGroup = { start: index, end: index, alliance, isUnreliable };
                                } else {
                                                                     // Extend current group
                                   currentGroup.end = index;
                                }
                              });
                              
                                                             // Add the last group
                               if (currentGroup) {
                                 lineGroups.push(currentGroup);
                               }
                              
                              
                              
                              return lineGroups.map((group, groupIndex) => {
                                                                                                  const colorClass = group.isUnreliable ? 'green' : 'gray';
                                 const segmentCount = group.end - group.start + 1;
                                 const widthPercent = (segmentCount / (segments.length - 1)) * 100;
                                const startSegment = segments[group.start];
                                const endSegment = segments[group.end + 1];
                                const allianceName = group.alliance === 'OW' ? 'Oneworld' : 
                                                   group.alliance === 'SA' ? 'Star Alliance' : 
                                                   group.alliance === 'ST' ? 'SkyTeam' : 
                                                   group.alliance;
                                
                                
                                
                                // Get the full route coverage
                                const routeSegments = [];
                                for (let i = group.start; i <= group.end + 1; i++) {
                                  routeSegments.push(segments[i]);
                                }
                                const fullRoute = routeSegments.join('-');
                                
                                // Get airlines in this line group
                                const airlinesInGroup: string[] = [];
                                for (let i = group.start; i <= group.end; i++) {
                                  const flight = flightsArr[i];
                                  const airlineCode = getAirlineCode(flight.FlightNumbers);
                                  airlinesInGroup.push(airlineCode);
                                }
                                
                                // Find airlines that can earn bonus miles on these flights
                                const bonusAirlines: Array<{code: string, name: string, ffp: string}> = [];
                                allAirlines.forEach(airline => {
                                  // Check if this airline's bonus array contains any of the airlines in the group
                                  // But exclude the airline itself (no self-bonus)
                                  const canEarnBonus = airlinesInGroup.some(code => 
                                    airline.bonus.includes(code) && airline.code !== code
                                  );
                                  if (canEarnBonus) {
                                    bonusAirlines.push({
                                      code: airline.code,
                                      name: airline.name,
                                      ffp: airline.ffp
                                    });
                                  }
                                });
                                
                                // Find airlines that can be booked for bonus earning on these flights
                                const bookableBonusAirlines: Array<{code: string, name: string, ffp: string}> = [];
                                allAirlines.forEach(airline => {
                                  // Check if any airline in the group has this airline in their bonus array
                                  const canBookForBonus = airlinesInGroup.some(code => {
                                    const airlineInGroup = allAirlines.find(a => a.code === code);
                                    return airlineInGroup?.bonus.includes(airline.code);
                                  });
                                  if (canBookForBonus) {
                                    bookableBonusAirlines.push({
                                      code: airline.code,
                                      name: airline.name,
                                      ffp: airline.ffp
                                    });
                                  }
                                });
                                
                                // Also check if any airline in the group can earn bonus miles on other airlines
                                airlinesInGroup.forEach(code => {
                                  const airlineInGroup = allAirlines.find(a => a.code === code);
                                  if (airlineInGroup?.bonus) {
                                    airlineInGroup.bonus.forEach(bonusCode => {
                                      const bonusAirline = allAirlines.find(a => a.code === bonusCode);
                                      if (bonusAirline && bonusAirline.ffp) {
                                        const alreadyIncluded = bookableBonusAirlines.some(a => a.code === bonusAirline.code);
                                        if (!alreadyIncluded) {
                                          bookableBonusAirlines.push({
                                            code: bonusAirline.code,
                                            name: bonusAirline.name,
                                            ffp: bonusAirline.ffp
                                          });
                                        }
                                      }
                                    });
                                  }
                                });
                                
                                // Get all airlines that operate these flights (for non-alliance airlines)
                                const operatingAirlines: Array<{code: string, name: string, ffp: string}> = [];
                                airlinesInGroup.forEach(code => {
                                  const airline = allAirlines.find(a => a.code === code);
                                  if (airline && airline.ffp) {
                                    operatingAirlines.push({
                                      code: airline.code,
                                      name: airline.name,
                                      ffp: airline.ffp
                                    });
                                  }
                                });
                                
                                                                 // Find recommended airlines based on operating airlines
                                 const allRecommendations: string[][] = [];
                                 airlinesInGroup.forEach(operatingCode => {
                                   const operatingAirline = allAirlines.find(a => a.code === operatingCode);
                                   if (operatingAirline?.recommend) {
                                     allRecommendations.push(operatingAirline.recommend);
                                   }
                                 });
                                 
                                 // Find intersection (common recommendations)
                                 const recommendedAirlines = new Set<string>();
                                 if (allRecommendations.length > 0) {
                                   const firstSet = new Set(allRecommendations[0]);
                                   for (const code of firstSet) {
                                     if (allRecommendations.every(recommendations => recommendations.includes(code))) {
                                       recommendedAirlines.add(code);
                                     }
                                   }
                                 }
                                 


                                 // Combine all booking options and remove duplicates based on airline code
                                 const allBookingOptions = [
                                   ...(allianceData[group.alliance || ''] || []),
                                   ...bonusAirlines,
                                   ...bookableBonusAirlines
                                 ]
                                   .filter((airline, index, array) => 
                                     array.findIndex(a => a.code === airline.code) === index
                                   )
                                   .sort((a, b) => a.name.localeCompare(b.name));
                                
                                                                 return (
                                   <TooltipTouch key={groupIndex} content={
                                     <div className="whitespace-pre-line max-w-[90vw] min-w-[350px] break-words overflow-hidden">
                                      {group.isUnreliable ? (
                                        <>
                                          <div className="font-semibold text-lg mb-2 text-center">{fullRoute}</div>
                                          <div className="text-sm text-center text-muted-foreground mb-2">(Cash / Positioning Leg)</div>
                                        </>
                                      ) : group.alliance && allianceData[group.alliance] ? (
                                        <>
                                          <div className="font-semibold text-lg mb-2 text-center">{fullRoute}</div>
                                          <div className="text-sm">
                                            {group.end - group.start + 1 === 1 ? 'This segment may be bookable on:' : 'These segments may be bookable on:'}
                                            <ul className="mt-2 list-disc list-inside">
                                              {allBookingOptions.map((airline: {code: string, name: string, ffp: string}) => {
                                                const isRecommended = recommendedAirlines.has(airline.code);
                                                return (
                                                  <li 
                                                    key={airline.code}
                                                    className={isRecommended ? "font-bold text-green-500" : ""}
                                                  >
                                                    {airline.name} {airline.ffp}
                                                  </li>
                                                );
                                              })}
                                            </ul>
                                            {group.end - group.start > 0 && (
                                              <div className="mt-3 text-xs text-muted-foreground">
                                                Note: You may not be able to find the full segments on some programs. Consider breaking it up if needed.
                                              </div>
                                            )}
                                            <div className="mt-2 text-xs text-muted-foreground">
                                              Some programs may only accept bookings via phone and options may not be available online.
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="font-semibold text-lg mb-2 text-center">{fullRoute}</div>
                                          {allBookingOptions.length > 0 && (
                                            <div className="text-sm">
                                              {group.end - group.start + 1 === 1 ? 'This segment may be bookable on:' : 'These segments may be bookable on:'}
                                              <ul className="mt-2 list-disc list-inside">
                                                {allBookingOptions.map((airline: {code: string, name: string, ffp: string}) => {
                                                  const isRecommended = recommendedAirlines.has(airline.code);
                                                  return (
                                                    <li 
                                                      key={airline.code}
                                                      className={isRecommended ? "font-bold text-green-500" : ""}
                                                    >
                                                      {airline.name} {airline.ffp}
                                                      {isRecommended && " (Recommended)"}
                                                    </li>
                                                  );
                                                })}
                                              </ul>
                                              {group.end - group.start > 0 && (
                                                <div className="mt-3 text-xs text-muted-foreground">
                                                  Note: You may not be able to find the full route on some programs. Consider breaking it up if needed.
                                                </div>
                                              )}
                                              <div className="mt-2 text-xs text-muted-foreground">
                                                Some programs may only accept bookings via phone and options may not be available online.
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  }>
                                                                         <div
                                       className="absolute top-1/2 transform -translate-y-1/2 h-1 rounded-full cursor-pointer"
                                       style={{ 
                                         left: `${(group.start / (segments.length - 1)) * 100}%`,
                                         width: `calc(${(segmentCount / (segments.length - 1)) * 100}% - 4px)`,
                                         marginRight: '4px',
                                         backgroundColor: colorClass === 'green' ? '#10b981' : '#6b7280'
                                       }}
                                     />
                                  </TooltipTouch>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      {(() => {
                        const hasCashLeg = flightsArr.some(f => {
                          const code = getAirlineCode(f.FlightNumbers);
                          const rel = reliability[code];
                          const min = rel?.min_count ?? 1;
                          const exemption = rel?.exemption || '';
                          const classCounts = [
                            { cls: 'Y', count: f.YCount },
                            { cls: 'W', count: f.WCount },
                            { cls: 'J', count: f.JCount },
                            { cls: 'F', count: f.FCount },
                          ];
                          return !classCounts.some(({ cls, count }) => {
                            const minCount = exemption.includes(cls) ? 1 : min;
                            return count >= minCount;
                          });
                        });
                        if (hasCashLeg) {
                          return (
                            <TooltipTouch content={<div>This itinerary contains a repositioning / cash leg</div>}>
                              <button
                                type="button"
                                tabIndex={0}
                                aria-label="Contains repositioning / cash leg"
                                className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 ml-1 align-middle"
                                style={{ touchAction: 'manipulation' }}
                              >
                                <DollarSign className="text-emerald-600 h-5 w-5" />
                              </button>
                            </TooltipTouch>
                          );
                        }
                        return null;
                      })()}
                      </div>
                    </div>
                    <span className="text-muted-foreground text-sm md:ml-4">{date}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-6 mt-2 md:mt-0 ml-auto">
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap">{formatDuration(totalDuration)}</span>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-sm font-medium">
                          {formatIsoTime(firstFlight.DepartsAt)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm font-medium">
                          {formatIsoTime(lastFlight.ArrivesAt)}
                          {(() => {
                            const arrDiff = getDayDiff(date, lastFlight.ArrivesAt);
                            return arrDiff > 0 ? (
                              <span className="text-xs text-muted-foreground ml-1">(+{arrDiff})</span>
                            ) : null;
                          })()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(cardKey)}
                      className="self-end md:self-center p-0 md:p-2 rounded hover:bg-muted transition-colors"
                      aria-label={isOpen ? "Collapse flight details" : "Expand flight details"}
                    >
                      {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>
                </CardContent>
              </div>
              <div className="px-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
                <div className="flex flex-wrap gap-2 items-center">
                  {flightsArr.map((f, i) => {
                    const code = f.FlightNumbers.slice(0, 2).toUpperCase();
                    const logoSrc = getAirlineLogoSrc(code, isDark);
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
                        {i < flightsArr.length - 1 && <span className="mx-1 text-muted-foreground">/</span>}
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
              <ExpandFade show={isOpen}>
                <>
                  <div className="w-full flex justify-center my-2">
                    <div className="h-px w-full bg-muted" />
                  </div>
                  <div className="px-6 pb-4">
                    <div className="flex flex-col gap-3">
                      {flightsArr.map((f, i) => {
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
                        // Map reliability to Record<string, { min_count: number; exemption?: string }> for this segment
                        const reliabilityMap: Record<string, { min_count: number; exemption?: string }> = {};
                        reliabilityMap[code] = reliability[code] ?? { min_count: 1 };
                        // Layover calculation
                        let layover = null;
                        if (i > 0) {
                          const prev = flightsArr[i - 1];
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
                                  {isLoadingCities && <span className="ml-2 animate-pulse text-muted-foreground"></span>}
                                  {cityError && <span className="ml-2 text-red-500">(city error)</span>}
                                </span>
                                <div className="flex-1 h-px bg-muted" />
                              </div>
                            );
                          }
                        }
                        // For each flight, calculate day difference from reference date
                        const depDiff = getDayDiffFromItinerary(date, f.DepartsAt);
                        const arrDiff = getDayDiffFromItinerary(date, f.ArrivesAt);
                        return (
                          <FlightCard
                            key={f.FlightNumbers + i}
                            flight={f}
                            segment={segment}
                            depDiff={depDiff}
                            arrDiff={arrDiff}
                            code={code}
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
              </ExpandFade>
            </Card>
          );
        })}
      </TooltipProvider>
    </div>
  );
};

export default AwardFinderResultsComponent; 