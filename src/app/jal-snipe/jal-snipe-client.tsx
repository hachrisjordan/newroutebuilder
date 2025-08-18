'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon, X, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import LiveSearchResultsCards from '@/components/award-finder/live-search-results-cards';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';


// Limited airport options for JAL Snipe
const LIMITED_AIRPORTS = [
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada' },
  { code: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States' },
  { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
  { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'United States' },
  { code: 'SAN', name: 'San Diego International Airport', city: 'San Diego', country: 'United States' },
  { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'United States' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
  { code: 'BOS', name: 'Boston Logan International Airport', city: 'Boston', country: 'United States' },
];

export default function JALSnipeClient() {
  const [direction, setDirection] = useState<string>('');
  const [airports, setAirports] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [iataToCity, setIataToCity] = useState<Record<string, string>>({});
  const [aircraftMap, setAircraftMap] = useState<Record<string, string>>({});
  const [isLoadingAircraft, setIsLoadingAircraft] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!direction || airports.length === 0 || !date?.from || !date?.to) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);
    
    try {
                const response = await fetch('https://api.bbairtools.com/api/jl-compute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: direction === 'from-japan' ? 'From Japan' : 'To Japan',
              airports: airports.join('/'),
              startdate: format(date.from, 'yyyy-MM-dd'),
              enddate: format(date.to, 'yyyy-MM-dd')
            })
          });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data);
      
    } catch (error: any) {
      console.error('Search failed:', error);
      setSearchError(error.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const getDateLabel = () => {
    if (!date?.from) {
      return <span className="text-muted-foreground">Pick a date range</span>;
    }
    if (!date.to) {
      return format(date.from, 'LLL dd, y');
    }
    return (
      <>
        {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
      </>
    );
  };

  const isSearchDisabled = !direction || airports.length === 0 || !date?.from || !date?.to;

  // Fetch aircraft table once on mount
  useEffect(() => {
    setIsLoadingAircraft(true);
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
      } finally {
        setIsLoadingAircraft(false);
      }
    };
    fetchAircraft();
  }, []);

  // Fetch missing city names when search results change
  useEffect(() => {
    if (!searchResults) return;
    const allIatas = new Set<string>();
    
    // Extract all IATA codes from the results
    if (searchResults.liveSearchAS?.data) {
      Object.entries(searchResults.liveSearchAS.data).forEach(([route, dates]: [string, any]) => {
        Object.entries(dates).forEach(([date, routes]: [string, any]) => {
          routes.forEach((routeData: any) => {
            allIatas.add(routeData.from);
            allIatas.add(routeData.to);
            (routeData.connections || []).forEach((conn: string) => allIatas.add(conn));
            (routeData.segments || []).forEach((seg: any) => {
              allIatas.add(seg.from);
              allIatas.add(seg.to);
            });
          });
        });
      });
    }
    
    // Only fetch IATAs not already in cache
    const missingIatas = Array.from(allIatas).filter(iata => !(iata in iataToCity));
    if (missingIatas.length === 0) return;
    
    setIsLoadingCities(true);
    setCityError(null);
    const fetchCities = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('airports')
          .select('iata, city_name')
          .in('iata', missingIatas);
        if (error) throw error;
        const newMap: Record<string, string> = { ...iataToCity };
        data?.forEach((row: { iata: string; city_name: string }) => {
          newMap[row.iata] = row.city_name;
        });
        setIataToCity(newMap);
      } catch (err: any) {
        setCityError(err.message || 'Failed to load city names');
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, [searchResults, iataToCity]);

  // Transform JAL API response to match LiveSearchResultsCards format
  const transformResults = (results: any) => {
    const itineraries: any[] = [];
    
    // Transform Married Segment data (liveSearchAS)
    if (results?.liveSearchAS?.data) {
      Object.entries(results.liveSearchAS.data).forEach(([route, dates]: [string, any]) => {
        Object.entries(dates).forEach(([date, routes]: [string, any]) => {
          routes.forEach((routeData: any) => {
            // Filter bundles to only show business class (J)
            const businessBundles = (routeData.bundles || []).filter((bundle: any) => bundle.class === 'J');
            
            itineraries.push({
              from: routeData.from,
              to: routeData.to,
              connections: routeData.connections || [],
              depart: routeData.depart,
              arrive: routeData.arrive,
              duration: routeData.duration,
              bundles: businessBundles,
              segments: routeData.segments || [],
                               __program: 'as',
                 __currency: 'USD',
                 __type: 'Married Segment'
            });
          });
        });
      });
    }
    
    // Transform Direct Search data (seatsAero2)
    if (results?.seatsAero2?.data?.routeDetails) {
      results.seatsAero2.data.routeDetails.forEach((route: any) => {
        // Create itinerary from direct route data
        itineraries.push({
          from: route.origin,
          to: route.destination,
          connections: [],
          depart: route.departsAt,
          arrive: route.arrivesAt,
          duration: route.duration,
          bundles: [{
            class: 'J',
            points: route.MileageCost?.toString() || '75000',
            fareTax: (route.TotalTaxes / 100).toFixed(2) // Convert cents to dollars
          }],
          segments: [{
            from: route.origin,
            to: route.destination,
            aircraft: route.aircraft?.[0] || 'Unknown',
            stops: 0,
            depart: route.departsAt,
            arrive: route.arrivesAt,
            flightnumber: route.flightNumber,
            duration: route.duration,
            layover: 0,
            distance: route.distance
          }],
                       __program: 'as',
             __currency: 'USD',
             __type: 'Direct Search'
        });
      });
    }
    
    return itineraries;
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6">


      {/* Search Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Direction */}
            <div className="flex flex-col justify-center">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">
                Direction
              </label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger className="w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="from-japan">From Japan</SelectItem>
                  <SelectItem value="to-japan">To Japan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Airports */}
            <div className="flex flex-col justify-center">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">
                Airports
              </label>
              <div className="relative w-full">
                <div
                  className="flex items-center flex-wrap gap-1 px-2 py-1 border rounded-md bg-background focus-within:ring-2 focus-within:ring-primary min-h-[2.25rem] w-full min-w-0 max-w-full sm:py-1 sm:px-2"
                  onClick={() => document.getElementById('airport-input')?.focus()}
                  tabIndex={-1}
                  style={{ cursor: 'text', overflowX: 'auto' }}
                >
                  {airports.map((code) => {
                    const airport = LIMITED_AIRPORTS.find(a => a.code === code);
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center bg-accent/60 text-[11px] rounded-sm px-1.5 py-0.5 mr-0.5 mb-0.5 max-w-[80px] truncate"
                        title={code}
                      >
                        <span className="truncate max-w-[54px]">{code}</span>
                        <button
                          type="button"
                          className="ml-0.5 text-muted-foreground hover:text-foreground p-0"
                          onClick={(e) => { e.stopPropagation(); setAirports(airports.filter(c => c !== code)); }}
                          tabIndex={-1}
                          style={{ minWidth: 18, minHeight: 18 }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                  <input
                    id="airport-input"
                    type="text"
                    placeholder={airports.length === 0 ? "Search airports..." : ""}
                    className="flex-1 min-w-[60px] bg-transparent outline-none border-none focus:ring-0 p-0 m-0 text-sm w-full max-w-full"
                    style={{ minWidth: '60px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        const searchValue = e.currentTarget.value.toUpperCase();
                        const airport = LIMITED_AIRPORTS.find(a => 
                          a.code === searchValue || 
                          a.city.toUpperCase().includes(searchValue) ||
                          a.name.toUpperCase().includes(searchValue)
                        );
                        if (airport && !airports.includes(airport.code)) {
                          setAirports([...airports, airport.code]);
                          e.currentTarget.value = '';
                        }
                      } else if (e.key === 'Backspace' && !e.currentTarget.value && airports.length > 0) {
                        e.preventDefault();
                        setAirports(airports.slice(0, -1));
                      }
                    }}
                    onFocus={() => {
                      // Show dropdown on focus
                      const dropdown = document.getElementById('airport-dropdown');
                      if (dropdown) dropdown.style.display = 'block';
                    }}
                    onBlur={() => {
                      // Hide dropdown on blur (with delay to allow click)
                      setTimeout(() => {
                        const dropdown = document.getElementById('airport-dropdown');
                        if (dropdown) dropdown.style.display = 'none';
                      }, 200);
                    }}
                  />
                </div>
                <div
                  id="airport-dropdown"
                  className="absolute z-50 w-full min-w-[250px] mt-1 bg-popover/95 dark:bg-popover/90 rounded-md shadow-lg border dark:border-border/50 max-h-[300px] overflow-y-auto min-w-0 hidden"
                >
                  {LIMITED_AIRPORTS
                    .filter(airport => !airports.includes(airport.code))
                    .map(option => (
                      <div
                        key={option.code}
                        className="px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors select-none pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30"
                        onClick={() => {
                          if (!airports.includes(option.code)) {
                            setAirports([...airports, option.code]);
                          }
                          document.getElementById('airport-dropdown')!.style.display = 'none';
                        }}
                        style={{ minHeight: 40 }}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold dark:text-foreground/90 text-sm sm:text-base">{option.code}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground/80">
                            {option.city} ({option.country})
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col justify-center">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">
                Date Range
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start text-left font-normal w-full h-10 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {getDateLabel()}
                    </span>
                    {date?.from && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDate(undefined);
                        }}
                        className="ml-2 p-1 hover:bg-muted rounded transition-colors"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto" align="start">
                  <Calendar
                    mode="range"
                    selected={date}
                    month={currentMonth}
                    fromDate={new Date()}
                    toDate={addDays(new Date(), 21)}
                    onMonthChange={setCurrentMonth}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        const diff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        if (diff > 5) {
                          // Limit to 5 days including start and end date
                          const maxEndDate = addDays(range.from, 4);
                          setDate({ from: range.from, to: maxEndDate });
                        } else {
                          setDate(range);
                        }
                      } else {
                        setDate(range);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Button */}
            <div className="flex flex-col justify-end">
              <Button 
                onClick={handleSearch}
                disabled={isSearchDisabled || isSearching}
                className="w-full"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>


        </CardContent>
      </Card>

      {/* Results Section */}
      {isSearching && (
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <span className="text-lg">Searching JAL availability...</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">This may take up to 1 minute</p>
          </CardContent>
        </Card>
      )}

      {searchError && (
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 dark:text-red-400">
              <h3 className="text-lg font-semibold mb-2">Search Error</h3>
              <p>{searchError}</p>
            </div>
          </CardContent>
        </Card>
      )}

            {searchResults && !isSearching && (
        <>
          {(() => {
            const allItineraries = transformResults(searchResults);
            const marriedSegmentItineraries = allItineraries.filter(itin => itin.__type === 'Married Segment');
            const directSearchItineraries = allItineraries.filter(itin => itin.__type === 'Direct Search');
            
            if (allItineraries.length === 0) {
              return (
                <Card className="mb-6">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No routes found for the selected criteria.</p>
                  </CardContent>
                </Card>
              );
            }
            
                         return (
               <>
                 {/* Direct Search Results */}
                 {directSearchItineraries.length > 0 && (
                   <div className="mb-12">
                     <h2 className="text-xl font-semibold mb-4">Direct search</h2>
                     <LiveSearchResultsCards
                       itineraries={directSearchItineraries}
                       iataToCity={iataToCity}
                       aircraftMap={aircraftMap}
                       isLoadingCities={isLoadingCities}
                       cityError={cityError}
                     />
                   </div>
                 )}
                 
                 {/* Married Segment Results */}
                 {marriedSegmentItineraries.length > 0 && (
                   <div className="mb-6">
                     <h2 className="text-xl font-semibold mb-4">
                       Married segments
                       <span className="text-xs text-muted-foreground ml-2 font-normal">
                         ({searchResults?.liveSearchAS?.totalRoutes || 0}/{searchResults?.summary?.totalRoutes || 0})
                       </span>
                     </h2>
                     <LiveSearchResultsCards
                       itineraries={marriedSegmentItineraries}
                       iataToCity={iataToCity}
                       aircraftMap={aircraftMap}
                       isLoadingCities={isLoadingCities}
                       cityError={cityError}
                     />
                   </div>
                 )}
               </>
             );
          })()}
        </>
      )}

    </div>
  );
}
