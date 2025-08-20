import { Card, CardContent } from '@/components/ui/card';
import type { Flight } from '@/types/award-finder-results';
import React from 'react';
import Image from 'next/image';
import { Progress } from '../ui/progress';
import { ChevronDown, ChevronUp, X, Check, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import { getAirlineLogoSrc, getTotalDuration, getClassPercentages } from '@/lib/utils';
import FlightCard from './flight-card';
import { TooltipTouch } from '@/components/ui/tooltip-touch';
import ExpandFade from '../ui/expand-fade';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// Cache interface for live search results
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // 30 minutes in milliseconds
}

// In-memory cache for live search results (fallback if Valkey not available)
const liveSearchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

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
  seats?: number; // Add seats parameter from award finder search
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

// Cache key generator for live search
function generateCacheKey(program: string, from: string, to: string, depart: string, seats: number): string {
  return `live-search:${program}:${from}:${to}:${depart}:${seats}`;
}

// Check if cache entry is still valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

// Get cached result if available and valid
function getCachedResult(cacheKey: string): any | null {
  const entry = liveSearchCache.get(cacheKey);
  if (entry && isCacheValid(entry)) {
    return entry.data;
  }
  if (entry && !isCacheValid(entry)) {
    liveSearchCache.delete(cacheKey);
  }
  return null;
}

// Cache result with TTL
function cacheResult(cacheKey: string, data: any): void {
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  };
  liveSearchCache.set(cacheKey, entry);
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

const AwardFinderResultsComponent: React.FC<AwardFinderResultsComponentProps> = ({ cards, flights, reliability, minReliabilityPercent, seats }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedFlightNumbers, setExpandedFlightNumbers] = useState<string | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<Record<string, Record<string, string>>>({});
  const [iataToCity, setIataToCity] = useState<Record<string, string>>({});
  const [liveSearchResults, setLiveSearchResults] = useState<Record<string, any>>({});
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [allianceData, setAllianceData] = useState<Record<string, Array<{code: string, name: string, ffp: string}>>>({});
     const [allAirlines, setAllAirlines] = useState<Array<{code: string, name: string, ffp: string, bonus: string[], recommend: string[]}>>([]);
  const [verifyingCards, setVerifyingCards] = useState<Set<string>>(new Set());
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

  const handleFlightNumbersToggle = (key: string) => {
    setExpandedFlightNumbers(expandedFlightNumbers === key ? null : key);
  };

  const handleProgramSelection = (cardKey: string, segmentKey: string, value: string) => {
    setSelectedPrograms(prev => ({
      ...prev,
      [cardKey]: {
        ...prev[cardKey],
        [segmentKey]: value
      }
    }));
  };

  // Function to find matching flights by flight number
  const findMatchingFlights = (liveSearchData: any, cardFlights: Flight[], route: string) => {
    if (!liveSearchData?.itinerary) return [];
    
    const matchingFlights = [];
    
    for (const itinerary of liveSearchData.itinerary) {
      for (const segment of itinerary.segments) {
        const flightNumber = segment.flightnumber;
        
        // Find matching flight in original card flights
        const matchingFlight = cardFlights.find(flight => 
          flight.FlightNumbers === flightNumber
        );
        
        if (matchingFlight) {
          matchingFlights.push({
            segment,
            originalFlight: matchingFlight,
            route,
            pricing: itinerary.bundles
          });
        }
      }
    }
    
    return matchingFlights;
  };

  const handleVerifyClick = async (cardKey: string) => {

    
    // Set loading state for this card
    setVerifyingCards(prev => new Set(prev).add(cardKey));
    
    const cardPrograms = selectedPrograms[cardKey] || {};
    const card = cards.find(c => `${c.route}-${c.date}-${cards.indexOf(c)}` === cardKey);
    
    if (!card || !seats) {
      setVerifyingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
      return;
    }
    
    // Get the segments and their dates
    const segments = card.route.split('-');
    const baseDate = new Date(card.date);
    
    // Get the flights for this card
    const cardFlights = card.itinerary.map(id => flights[id]).filter(Boolean);
    
    // Get the actual selected segments from the verify dropdowns
    const selectedSegments = Object.keys(cardPrograms).filter(route => 
      cardPrograms[route] && cardPrograms[route] !== ''
    );
    
    // Check for consecutive segments with the same program to try merging first
    const mergeResults: Record<string, any> = {};
    const individualResults: Record<string, any> = {};
    
    // Group consecutive segments by program
    const segmentGroups: Array<{routes: string[], program: string, startSegment: string, endSegment: string}> = [];
    let currentGroup: {routes: string[], program: string, startSegment: string, endSegment: string} | null = null;
    
    selectedSegments.sort().forEach(route => {
      const [startSegment, endSegment] = route.split('-');
      const program = cardPrograms[route];
      
      if (!currentGroup || currentGroup.program !== program || currentGroup.endSegment !== startSegment) {
        // Start new group
        if (currentGroup) {
          segmentGroups.push(currentGroup);
        }
        currentGroup = {
          routes: [route],
          program,
          startSegment,
          endSegment
        };
      } else {
        // Extend current group
        currentGroup.routes.push(route);
        currentGroup.endSegment = endSegment;
      }
    });
    
    // Add the last group
    if (currentGroup) {
      segmentGroups.push(currentGroup);
    }
    
    // Try merged searches first for groups with multiple segments
    for (const group of segmentGroups) {
      if (group.routes.length > 1) {
        
                 try {
           // Calculate departure date for the first segment
           const firstSegmentIndex = segments.findIndex(segment => segment === group.startSegment);
           const firstFlight = cardFlights[firstSegmentIndex];
           
           let departDate = baseDate.toISOString().split('T')[0];
           if (firstFlight) {
             const departsAt = new Date(firstFlight.DepartsAt);
             const dayDiff = Math.floor((departsAt.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
             const segmentDate = new Date(baseDate);
             segmentDate.setDate(baseDate.getDate() + dayDiff);
             departDate = segmentDate.toISOString().split('T')[0];
           }
           
           // Check cache first for merged search
           const mergeCacheKey = generateCacheKey(group.program, group.startSegment, group.endSegment, departDate, seats);
           let mergeData = getCachedResult(mergeCacheKey);
           
           if (!mergeData) {
             // Try merged search if not in cache
             const mergeResponse = await fetch(`https://api.bbairtools.com/api/live-search-${group.program.toLowerCase()}`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ 
                 from: group.startSegment, 
                 to: group.endSegment, 
                 depart: departDate, 
                 ADT: seats 
               }),
             });
             
             if (mergeResponse.ok) {
               mergeData = await mergeResponse.json();
               // Cache the successful result
               cacheResult(mergeCacheKey, mergeData);
             }
           }
           
           if (mergeData) {
             
             // Check if merged result contains all required flight numbers
             const requiredFlightNumbers = group.routes.map(route => {
               const [start, end] = route.split('-');
               const startIndex = segments.findIndex(segment => segment === start);
               return cardFlights[startIndex]?.FlightNumbers;
             }).filter(Boolean);
             
             const hasAllFlights = mergeData.itinerary?.some((itinerary: any) => {
               const itineraryFlightNumbers = itinerary.segments?.map((segment: any) => segment.flightnumber) || [];
               return requiredFlightNumbers.every(required => 
                 itineraryFlightNumbers.includes(required)
               );
             });
             
             if (hasAllFlights) {
               mergeResults[`${group.startSegment}-${group.endSegment}`] = {
                 data: mergeData,
                 routes: group.routes,
                 program: group.program
               };
               continue; // Skip individual searches for this group
             }
           }
        } catch (error) {
          console.error(`Merged search error for ${group.startSegment}-${group.endSegment}:`, error);
        }
      }
    }
    
    // Fall back to individual segment searches for segments not covered by merges
    const segmentsToSearchIndividually = selectedSegments.filter(route => {
      // Check if this route is covered by any successful merge
      return !Object.values(mergeResults).some(mergeResult => 
        mergeResult.routes.includes(route)
      );
    });
    
    // Create an array of promises for parallel API calls for individual segments
    const apiCalls = segmentsToSearchIndividually.map(async (route) => {
      const [startSegment, endSegment] = route.split('-');
      
      // Get the selected program for this segment
      const selectedProgram = cardPrograms[route];
      
      if (!selectedProgram) {
        return null;
      }
      
      // Find the flight that corresponds to this segment
      const segmentIndex = segments.findIndex(segment => segment === startSegment);
      const flight = cardFlights[segmentIndex];
      
      // Calculate the departure date for this segment
      let segmentDate = new Date(baseDate);
      if (segmentIndex > 0 && flight) {
        // Add days based on the flight's departure time
        const departsAt = new Date(flight.DepartsAt);
        const dayDiff = Math.floor((departsAt.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        segmentDate.setDate(baseDate.getDate() + dayDiff);
      }
      
      const departDate = segmentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      

      
      try {
        // Check cache first for individual segment search
        const individualCacheKey = generateCacheKey(selectedProgram, startSegment, endSegment, departDate, seats);
        let data = getCachedResult(individualCacheKey);
        
        if (!data) {
          // Make API call if not in cache
          const response = await fetch(`https://api.bbairtools.com/api/live-search-${selectedProgram.toLowerCase()}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              from: startSegment, 
              to: endSegment, 
              depart: departDate, 
              ADT: seats 
            }),
          });
          
          if (!response.ok) {
            console.error(`Live search failed for ${route}: ${response.status}`);
            return { route, error: `HTTP ${response.status}` };
          }
          
          data = await response.json();
          // Cache the successful result
          cacheResult(individualCacheKey, data);
        }
        
        // Find matching flights by comparing flight numbers
        const matchingFlights = findMatchingFlights(data, cardFlights, route);
        
        return { route, data, matchingFlights };
        
      } catch (error) {
        console.error(`Live search error for ${route}:`, error);
        return { route, error: error instanceof Error ? error.message : String(error) };
      }
    });
    
    // Execute all API calls in parallel
    const results = await Promise.all(apiCalls);
    
    // Combine merge results with individual results
    const allResults = { ...mergeResults };
    results.forEach(result => {
      if (result && !result.error) {
        allResults[result.route] = result;
      }
    });
    
    // Store results in state for display
    setLiveSearchResults(prev => ({
      ...prev,
      [cardKey]: allResults
    }));
    

    
    // Clear loading state for this card
    setVerifyingCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(cardKey);
      return newSet;
    });
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
                              <div className="px-4 pb-4 flex flex-col gap-2 text-sm">
                {/* TOP ROW: Flight Numbers + Percentage Bars */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
                  {/* Flight Numbers + Expansion Button */}
                  <div className="flex items-center gap-2">
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
                    {(() => {
                      // Check if this route can expand (has eligible options for all non-cash segments)
                      const segments = route.split('-');
                      
                      // Use the same logic that creates the colored lines under the route string
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
                      
                      // Group consecutive segments by alliance for non-unreliable segments (same logic as colored lines)
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
                      
                      // Check if ALL non-cash segments have at least one supported option (AS or B6)
                      const supportedAirlines = ['AS', 'B6']; // Alaska Airlines and JetBlue
                      let allSegmentsHaveOptions = true;
                      
                      for (const group of lineGroups) {
                        // Skip cash segments (unreliable)
                        if (group.isUnreliable) {
                          continue;
                        }
                        
                        // Check if this non-cash segment has any supported options
                        const airlinesInGroup: string[] = [];
                        for (let i = group.start; i <= group.end; i++) {
                          const flight = flightsArr[i];
                          const airlineCode = getAirlineCode(flight.FlightNumbers);
                          airlinesInGroup.push(airlineCode);
                        }
                        
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
                        
                        // Check if any recommended airlines are supported
                        const hasSupportedOptions = allAirlines.some(airline => 
                          recommendedAirlines.has(airline.code) && supportedAirlines.includes(airline.code)
                        );
                        
                        if (!hasSupportedOptions) {
                          allSegmentsHaveOptions = false;
                          break;
                        }
                      }
                      
                      // Only render the expand button if the route can expand
                      if (!allSegmentsHaveOptions) {
                        return null;
                      }
                      
                      return (
                        <button
                          onClick={() => handleFlightNumbersToggle(cardKey)}
                          className="ml-2 p-1 rounded hover:bg-muted transition-colors"
                          aria-label={expandedFlightNumbers === cardKey ? "Collapse verification" : "Expand verification"}
                        >
                          {expandedFlightNumbers === cardKey ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      );
                    })()}
                  </div>
                  
                  {/* PERCENTAGE BARS - 2x2 grid on mobile, row on desktop */}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-4 sm:items-center">
                    <ClassBar label="Y" percent={y} />
                    <ClassBar label="W" percent={w} />
                    <ClassBar label="J" percent={j} />
                    <ClassBar label="F" percent={f} />
                  </div>
                </div>
                
                                 {/* BOTTOM: Expansion details below the top row */}
                 {expandedFlightNumbers === cardKey && (() => {
                   const segments = route.split('-');
                   
                   // Use the same logic that creates the colored lines under the route string
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
                   
                   // Group consecutive segments by alliance for non-unreliable segments (same logic as colored lines)
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
                   
                   // Check if ALL non-cash segments have at least one supported option (AS or B6)
                   const supportedAirlines = ['AS', 'B6']; // Alaska Airlines and JetBlue
                   let allSegmentsHaveOptions = true;
                   
                   for (const group of lineGroups) {
                     // Skip cash segments (unreliable)
                     if (group.isUnreliable) {
                       continue;
                     }
                     
                     // Check if this non-cash segment has any supported options
                     const airlinesInGroup: string[] = [];
                     for (let i = group.start; i <= group.end; i++) {
                       const flight = flightsArr[i];
                       const airlineCode = getAirlineCode(flight.FlightNumbers);
                       airlinesInGroup.push(airlineCode);
                     }
                     
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
                     
                     // Check if any recommended airlines are supported
                     const hasSupportedOptions = allAirlines.some(airline => 
                       recommendedAirlines.has(airline.code) && supportedAirlines.includes(airline.code)
                     );
                     
                     if (!hasSupportedOptions) {
                       allSegmentsHaveOptions = false;
                       break;
                     }
                   }
                   
                   // If any non-cash segment is missing options, don't render anything
                   if (!allSegmentsHaveOptions) {
                     return null;
                   }
                   
                   // Create select boxes for each line group
                   return (
                     <div className="mt-2">
                       <div className="mb-3">
                                                      <Button
                               size="sm"
                               onClick={() => handleVerifyClick(cardKey)}
                               disabled={(() => {
                                 // Check if all NON-CASH segments have selected programs
                                 const cardPrograms = selectedPrograms[cardKey] || {};
                                 const nonCashSegmentsHavePrograms = lineGroups
                                   .filter(group => !group.isUnreliable) // Only check non-cash segments
                                   .every(group => {
                                     const startSegment = segments[group.start];
                                     const endSegment = segments[group.end + 1];
                                     const segmentKey = `${startSegment}-${endSegment}`;
                                     return cardPrograms[segmentKey];
                                   });
                                 return !nonCashSegmentsHavePrograms;
                               })() || verifyingCards.has(cardKey)}
                               className="bg-gray-800 text-gray-100 border border-gray-600 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               {verifyingCards.has(cardKey) ? (
                                 <>
                                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                   Verifying...
                                 </>
                               ) : (
                                 'Verify'
                               )}
                             </Button>
                       </div>
                       
                       <div className="flex flex-col gap-2">
                         {lineGroups.map((group, groupIndex) => {
                           const startSegment = segments[group.start];
                           const endSegment = segments[group.end + 1];
                           const route = `${startSegment}-${endSegment}`;
                           
                           // Check if this route is covered by a successful merge
                           const cardPrograms = selectedPrograms[cardKey] || {};
                           const selectedProgram = cardPrograms[route];
                           
                           // Check if there's a merged result that covers this route
                           // Look for both the new merge structure (with routes array) and the direct merge structure
                           const mergedResult = liveSearchResults[cardKey] && 
                             Object.values(liveSearchResults[cardKey]).find((result: any) => {
                               // Check if this is a multi-route merge result
                               if ((result as any).routes && (result as any).routes.includes(route)) {
                                 return true;
                               }
                               // Check if this is a direct merge result that covers this route
                               if ((result as any).from && (result as any).to && 
                                   (result as any).from !== (result as any).to &&
                                   (result as any).bundles) {
                                 // This is a direct merge result, check if it covers our route
                                 const resultFrom = (result as any).from;
                                 const resultTo = (result as any).to;
                                 const routeFrom = route.split('-')[0];
                                 const routeTo = route.split('-')[1];
                                 
                                 // Check if this merge result covers our route
                                 return resultFrom === routeFrom && resultTo === routeTo;
                               }
                               return false;
                             }) as any;
                           

                           
                           // If this is a merged route and we have a program selected, show the merged route
                           if (selectedProgram && mergedResult && 
                               ((mergedResult.routes && mergedResult.routes.length > 1) || 
                                (mergedResult.from && mergedResult.to && mergedResult.bundles))) {
                               
                               // SIMPLE DEDUP: Only show merged route for the FIRST group that matches
                               // This prevents duplicate merged displays
                               const isFirstMergedGroup = groupIndex === 0;
                               if (!isFirstMergedGroup) {
                                 return null; // Skip duplicate merged routes
                               }
                               // This is a multi-segment merge, show the full route
                               let mergedRoute: string;
                               
                               if (mergedResult.routes && mergedResult.routes.length > 1) {
                                 // Multi-route merge structure
                                 const firstRoute = mergedResult.routes[0];
                                 const lastRoute = mergedResult.routes[mergedResult.routes.length - 1];
                                 const [firstStart] = firstRoute.split('-');
                                 const [lastEnd] = lastRoute.split('-').slice(-1);
                                 mergedRoute = `${firstStart}-${lastEnd}`;
                               } else {
                                 // Direct merge structure
                                 mergedRoute = `${mergedResult.from}-${mergedResult.to}`;
                               }
                               

                               
                               return (
                                 <div key={groupIndex} className="flex flex-col gap-2 w-full">
                                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                     <div className="flex items-center gap-2">
                                       <span className="text-sm font-mono text-muted-foreground">{mergedRoute}:</span>
                                       <Select 
                                         value={selectedProgram} 
                                         onValueChange={(value) => handleProgramSelection(cardKey, route, value)}
                                       >
                                         <SelectTrigger className="w-48 h-8 text-xs">
                                           <SelectValue placeholder="Select recommended program" />
                                         </SelectTrigger>
                                         <SelectContent>
                                           {(() => {
                                             // Get recommendations for the merged route
                                             const mergedSegments = [];
                                             for (let i = group.start; i <= group.end + 1; i++) {
                                               mergedSegments.push(segments[i]);
                                             }
                                             
                                             const airlinesInGroup: string[] = [];
                                             for (let i = group.start; i <= group.end; i++) {
                                               const flight = flightsArr[i];
                                               const airlineCode = getAirlineCode(flight.FlightNumbers);
                                               airlinesInGroup.push(airlineCode);
                                             }
                                             
                                             const allRecommendations: string[][] = [];
                                             airlinesInGroup.forEach(operatingCode => {
                                               const operatingAirline = allAirlines.find(a => a.code === operatingCode);
                                               if (operatingAirline?.recommend) {
                                                 allRecommendations.push(operatingAirline.recommend);
                                               }
                                             });
                                             
                                             const recommendedAirlines = new Set<string>();
                                             if (allRecommendations.length > 0) {
                                               const firstSet = new Set(allRecommendations[0]);
                                               for (const code of firstSet) {
                                                 if (allRecommendations.every(recommendations => recommendations.includes(code))) {
                                                   recommendedAirlines.add(code);
                                                 }
                                               }
                                             }
                                             
                                             const supportedAirlines = ['AS', 'B6'];
                                             const recommendedAirlinesList = allAirlines.filter(airline => 
                                               recommendedAirlines.has(airline.code) && supportedAirlines.includes(airline.code)
                                             ).sort((a, b) => a.name.localeCompare(b.name));
                                             
                                             return recommendedAirlinesList.map((airline) => (
                                               <SelectItem 
                                                 key={airline.code} 
                                                 value={airline.code}
                                                 className="font-bold text-green-600"
                                               >
                                                 {airline.name} {airline.ffp}
                                               </SelectItem>
                                             ));
                                           })()}
                                         </SelectContent>
                                       </Select>
                                     </div>
                                     
                                     {/* Show merged pricing */}
                                     {(() => {
                                       // Find the specific itinerary option that matches our flight numbers
                                       let mergedPricing = null;
                                       let matchingItinerary: any = null;
                                       
                                       if (mergedResult.data?.itinerary) {
                                         // We have an array of itinerary options, find the one matching our flights
                                         // Use the cardFlights from the outer scope
                                         const requiredFlightNumbers = flightsArr.map((f: any) => f.FlightNumbers).filter(Boolean);
                                         
                                         // Find the itinerary option that contains all our flight numbers
                                         matchingItinerary = mergedResult.data.itinerary.find((option: any) => {
                                           if (!option.segments) return false;
                                           
                                           const optionFlightNumbers = option.segments.map((seg: any) => seg.flightnumber);
                                           
                                           // Check if this option contains all our required flight numbers
                                           const hasAllFlights = requiredFlightNumbers.every((required: any) => 
                                             optionFlightNumbers.includes(required)
                                           );
                                           
                                           return hasAllFlights;
                                         });
                                         
                                         if (matchingItinerary) {
                                           mergedPricing = matchingItinerary.bundles;
                                         }
                                       }
                                       
                                       // Fallback to other structures if no match found
                                       if (!mergedPricing) {
                                         mergedPricing = mergedResult.data?.bundles || mergedResult.bundles;
                                       }
                                       
                                       if (mergedPricing) {
                                         return (
                                           <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                                             {mergedPricing
                                               .slice()
                                               .sort((a: any, b: any) => {
                                                 const order = ['Y', 'W', 'J', 'F'];
                                                 return order.indexOf(a.class) - order.indexOf(b.class);
                                               })
                                               .map((bundle: any) => {
                                                 const classBarColors: Record<string, string> = {
                                                   Y: '#E8E1F2',
                                                   W: '#B8A4CC',
                                                   J: '#F3CD87',
                                                   F: '#D88A3F',
                                                 };
                                                 const bg = classBarColors[bundle.class] || '#E8E1F2';
                                                 
                                                 return (
                                                   <div key={bundle.class} className="flex flex-col items-center">
                                                     <span
                                                       className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold"
                                                       style={{ background: bg, color: '#222' }}
                                                     >
                                                       <span className="mr-1">{bundle.class}:</span>
                                                       <span className="tabular-nums">{Number(bundle.points).toLocaleString()}</span>
                                                       <span className="ml-1 text-xs font-normal opacity-80">
                                                         +{Number(bundle.fareTax).toFixed(2)}
                                                       </span>
                                                     </span>
                                                     
                                                     {/* Mixed-cabin bar logic for merged results */}
                                                     {(() => {
                                                       if (!matchingItinerary?.segments) return (
                                                         <div
                                                           className="w-full h-1 rounded-full mt-0.5"
                                                           style={{ background: bg }}
                                                         />
                                                       );
                                                       
                                                       // Gather segment class for this bundle
                                                       const segments = matchingItinerary.segments;
                                                       const totalDistance = segments.reduce((sum: number, seg: any) => sum + (seg.distance || 0), 0) || 1;
                                                       
                                                       // For each segment, get the class for this bundle
                                                       const segClasses = segments.map((seg: any) => {
                                                         let segClass = bundle.class;
                                                         if (Array.isArray(seg.bundleClasses) && seg.bundleClasses.length > 0) {
                                                           // Look for a key matching the bundle, e.g., 'WClass' for W
                                                           const key = bundle.class + 'Class';
                                                           const entry = seg.bundleClasses.find((obj: Record<string, string>) => key in obj);
                                                           if (entry && typeof entry[key] === 'string' && ['Y','W','J','F'].includes(entry[key])) {
                                                             segClass = entry[key];
                                                           }
                                                         }
                                                         return { segClass, distance: seg.distance || 0 };
                                                       });
                                                       
                                                       // Only render split bar if there are multiple unique classes
                                                       const uniqueClasses = Array.from(new Set(segClasses.map((sc: any) => sc.segClass)));
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
                                                           {segClasses.map((sc: any, idx: number) => {
                                                             const segWidth = `${(sc.distance / totalDistance) * 100}%`;
                                                             const segColor = classBarColors[sc.segClass] || '#E8E1F2';
                                                             // Get segment path for tooltip
                                                             const seg = segments[idx];
                                                             const segPath = `${seg.from}-${seg.to}`;
                                                             const classLabel = sc.segClass;
                                                             return (
                                                               <div
                                                                 key={idx}
                                                                 title={`${segPath}: ${classLabel}`}
                                                                 style={{
                                                                   width: segWidth,
                                                                   background: segColor,
                                                                   borderRadius: '9999px',
                                                                   marginLeft: idx > 0 ? '1px' : 0,
                                                                   marginRight: idx < segClasses.length - 1 ? '1px' : 0,
                                                                   cursor: 'pointer',
                                                                 }}
                                                               />
                                                             );
                                                           })}
                                                         </div>
                                                       );
                                                     })()}
                                                   </div>
                                                 );
                                               })}
                                           </div>
                                         );
                                       }
                                       return null;
                                     })()}
                                   </div>
                                 </div>
                               );
                             }
                           
                           // Check if this route is already handled by a merge (to prevent duplicate display)
                           // We need to check if ANY route in the current lineGroups would result in the same merged display
                           const isAlreadyHandledByMerge = liveSearchResults[cardKey] && 
                             Object.values(liveSearchResults[cardKey]).some((result: any) => {
                               // Check multi-route merge structure
                               if ((result as any).routes && (result as any).routes.includes(route) && 
                                   (result as any).routes.length > 1) {
                                 return true;
                               }
                               // Check direct merge structure
                               if ((result as any).from && (result as any).to && 
                                   (result as any).from !== (result as any).to &&
                                   (result as any).bundles) {
                                 const resultFrom = (result as any).from;
                                 const resultTo = (result as any).to;
                                 
                                 // Check if this merge result covers our route
                                 const routeFrom = route.split('-')[0];
                                 const routeTo = route.split('-')[1];
                                 if (resultFrom === routeFrom && resultTo === routeTo) {
                                   return true;
                                 }
                                 
                                 // ALSO check if this merge result would cover ANY route that would result in the same merged display
                                 // This prevents showing multiple routes that would all display the same merged result
                                 const allRoutesInLineGroups = lineGroups.map(g => {
                                   const start = segments[g.start];
                                   const end = segments[g.end + 1];
                                   return `${start}-${end}`;
                                 });
                                 
                                 // If this merge result covers multiple routes in our lineGroups, 
                                 // we should only show it once and skip the others
                                 const routesCoveredByMerge = allRoutesInLineGroups.filter(r => {
                                   const [rFrom, rTo] = r.split('-');
                                   return rFrom === resultFrom && rTo === resultTo;
                                 });
                                 
                                 // If this merge covers multiple routes, only show it for the first one
                                 if (routesCoveredByMerge.length > 1) {
                                   const firstRoute = routesCoveredByMerge[0];
                                   if (route !== firstRoute) {
                                     return true; // Skip this route, it will be shown as part of the merged display
                                   }
                                 }
                                 
                                 return false;
                               }
                               return false;
                             });
                           
                           // Skip this route if it's already handled by a merge
                           if (isAlreadyHandledByMerge) {
                             return null;
                           }
                           

                           
                           // Get the full route coverage
                           const routeSegments = [];
                           for (let i = group.start; i <= group.end + 1; i++) {
                             routeSegments.push(segments[i]);
                           }
                           
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
                           
                           // Filter to show only supported airlines (AS and B6) that are also recommended
                           const supportedAirlines = ['AS', 'B6']; // Alaska Airlines and JetBlue
                           const recommendedAirlinesList = allAirlines.filter(airline => 
                             recommendedAirlines.has(airline.code) && supportedAirlines.includes(airline.code)
                           ).sort((a, b) => a.name.localeCompare(b.name));
                           
                           // Only render the select box if there are options
                           if (recommendedAirlinesList.length === 0) {
                             return null;
                           }
                           
                                                                                     // Get live search pricing for this route (check both merged and individual results)
                           const liveSearchData = liveSearchResults[cardKey]?.[route] || 
                             Object.values(liveSearchResults[cardKey] || {}).find((result: any) => {
                               // Check multi-route merge structure
                               if ((result as any).routes && (result as any).routes.includes(route)) {
                                 return true;
                               }
                               // Check direct merge structure
                               if ((result as any).from && (result as any).to && 
                                   (result as any).from !== (result as any).to &&
                                   (result as any).bundles) {
                                 const resultFrom = (result as any).from;
                                 const resultTo = (result as any).to;
                                 const routeFrom = route.split('-')[0];
                                 const routeTo = route.split('-')[1];
                                 return resultFrom === routeFrom && resultTo === routeTo;
                               }
                               return false;
                             });
                           
                           // MUST FIND THE RIGHT FLIGHT NUMBERS LIKE THE MERGED API
                           let pricing = null;
                           let matchingItinerary: any = null;
                           
                           // Check for your API structure first (direct segments)
                           if (liveSearchData?.segments) {
                             // Your API structure: direct segments array
                             // Get only the flights that belong to THIS route group, not all flights in the card
                             const routeFlights: string[] = [];
                             for (let i = group.start; i <= group.end; i++) {
                               const flight = flightsArr[i];
                               if (flight.FlightNumbers) {
                                 routeFlights.push(flight.FlightNumbers);
                               }
                             }
                             
                             // Check if API segments contain the flights for THIS route
                             const optionFlightNumbers = liveSearchData.segments.map((seg: any) => seg.flightnumber);
                             const hasRouteFlights = routeFlights.every((required: any) => 
                               optionFlightNumbers.includes(required)
                             );
                             
                             if (hasRouteFlights) {
                               // Use the EXACT same structure as merged view
                               matchingItinerary = { 
                                 segments: liveSearchData.segments,
                                 data: { itinerary: [{ segments: liveSearchData.segments }] }
                               };
                               pricing = liveSearchData.bundles;
                             }
                           }
                           // Check for standard API structure (data.itinerary)
                           else if (liveSearchData?.data?.itinerary) {
                             // Standard API structure: data.itinerary array
                             // Get only the flights that belong to THIS route group, not all flights in the card
                             const routeFlights: string[] = [];
                             for (let i = group.start; i <= group.end; i++) {
                               const flight = flightsArr[i];
                               if (flight.FlightNumbers) {
                                 routeFlights.push(flight.FlightNumbers);
                               }
                             }
                             
                             // Find the itinerary option that contains the flights for THIS route
                             matchingItinerary = liveSearchData.data.itinerary.find((option: any) => {
                               if (!option.segments) return false;
                               
                               const optionFlightNumbers = option.segments.map((seg: any) => seg.flightnumber);
                               
                               // Check if this option contains the flights for THIS route
                               const hasRouteFlights = routeFlights.every((required: any) => 
                                 optionFlightNumbers.includes(required)
                               );
                               
                               return hasRouteFlights;
                             });
                             
                             if (matchingItinerary) {
                               pricing = matchingItinerary.bundles;
                             }
                           }
                           
                           // Fallback to other structures if no match found
                           if (!pricing) {
                             pricing = liveSearchData?.matchingFlights?.[0]?.pricing || 
                                       liveSearchData?.data?.itinerary?.[0]?.bundles || 
                                       liveSearchData?.bundles;
                           }
                           
                                                       return (
                              <div key={groupIndex} className="flex flex-col gap-2 w-full">
                                {/* TOP ROW: Route + Dropdown (Desktop) / Stacked (Mobile) */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono text-muted-foreground">{route}:</span>
                                    <Select 
                                      value={selectedPrograms[cardKey]?.[route] || ''} 
                                      onValueChange={(value) => handleProgramSelection(cardKey, route, value)}
                                    >
                                      <SelectTrigger className="w-48 h-8 text-xs">
                                        <SelectValue placeholder="Select recommended program" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {recommendedAirlinesList.map((airline) => (
                                          <SelectItem 
                                            key={airline.code} 
                                            value={airline.code}
                                            className="font-bold text-green-600"
                                          >
                                            {airline.name} {airline.ffp}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Live Search Pricing - Left aligned on mobile, right aligned on desktop */}
                                  {pricing && (
                                    <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                                      {pricing
                                        .slice()
                                        .sort((a: any, b: any) => {
                                          const order = ['Y', 'W', 'J', 'F'];
                                          return order.indexOf(a.class) - order.indexOf(b.class);
                                        })
                                        .map((bundle: any) => {
                                          const classBarColors: Record<string, string> = {
                                            Y: '#E8E1F2', // lavender
                                            W: '#B8A4CC', // purple
                                            J: '#F3CD87', // gold
                                            F: '#D88A3F', // orange
                                          };
                                          const bg = classBarColors[bundle.class] || '#E8E1F2';
                                          
                                          return (
                                            <div key={bundle.class} className="flex flex-col items-center">
                                              <span
                                                className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold"
                                                style={{ background: bg, color: '#222' }}
                                              >
                                                <span className="mr-1">{bundle.class}:</span>
                                                <span className="tabular-nums">{Number(bundle.points).toLocaleString()}</span>
                                                <span className="ml-1 text-xs font-normal opacity-80">
                                                  +{Number(bundle.fareTax).toFixed(2)}
                                              </span>
                                              </span>
                                              {/* Mixed-cabin bar logic for normal API results */}
                                              {(() => {
                                                if (!matchingItinerary?.segments) {
                                                  return (
                                                    <div
                                                      className="w-full h-1 rounded-full mt-0.5"
                                                      style={{ background: bg }}
                                                    />
                                                  );
                                                }
                                                
                                                // Gather segment class for this bundle
                                                const segments = matchingItinerary.segments;
                                                
                                                const totalDistance = segments.reduce((sum: number, seg: any) => sum + (seg.distance || 0), 0) || 1;
                                                
                                                // For each segment, get the class for this bundle
                                                const segClasses = segments.map((seg: any) => {
                                                  let segClass = bundle.class;
                                                  
                                                  if (Array.isArray(seg.bundleClasses) && seg.bundleClasses.length > 0) {
                                                    // Look for a key matching the bundle, e.g., 'WClass' for W
                                                    const key = bundle.class + 'Class';
                                                    
                                                    const entry = seg.bundleClasses.find((obj: Record<string, string>) => key in obj);
                                                    
                                                    if (entry && typeof entry[key] === 'string' && ['Y','W','J','F'].includes(entry[key])) {
                                                      segClass = entry[key];
                                                    }
                                                  }
                                                  
                                                  const result = { segClass, distance: seg.distance || 0 };
                                                  return result;
                                                });
                                                
                                                // Only render split bar if there are multiple unique classes
                                                const uniqueClasses = Array.from(new Set(segClasses.map((sc: any) => sc.segClass)));
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
                                                    {segClasses.map((sc: any, idx: number) => {
                                                      const segWidth = `${(sc.distance / totalDistance) * 100}%`;
                                                      const segColor = classBarColors[sc.segClass] || '#E8E1F2';
                                                      // Get segment path for tooltip
                                                      const seg = segments[idx];
                                                      const segPath = `${seg.from}-${seg.to}`;
                                                      const classLabel = sc.segClass;
                                                      
                                                      return (
                                                        <div
                                                          key={idx}
                                                          title={`${segPath}: ${classLabel}`}
                                                          style={{
                                                            width: segWidth,
                                                            background: segColor,
                                                            borderRadius: '9999px',
                                                            marginLeft: idx > 0 ? '1px' : 0,
                                                            marginRight: idx < segClasses.length - 1 ? '1px' : 0,
                                                            cursor: 'pointer',
                                                          }}
                                                        />
                                                      );
                                                    })}
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                         })}
                       </div>
                     </div>
                   );
                 })()}
                 
                 {/* Flight details expansion */}
                 <ExpandFade show={isOpen}>
                   <>
                     <div className="w-full flex justify-center my-2">
                       <div className="h-px w-full bg-muted" />
                     </div>
                     <div className="px-4 pb-4">
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
               </div>
            </Card>
          );
        })}
      </TooltipProvider>
    </div>
  );
};

export default AwardFinderResultsComponent; 