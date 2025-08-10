'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Plane, ChevronDown, ChevronUp, Loader2, CalendarIcon, X } from 'lucide-react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { format, parseISO, addYears } from 'date-fns';
import { Pagination } from '@/components/ui/pagination';
import ExpandFade from '@/components/ui/expand-fade';
import airportsData from '@/data/airports.json';
import type { DateRange } from 'react-day-picker';

interface LufthansaFlight {
  id: string;
  total_duration: number;
  remaining_seats: number;
  distance: number;
  mileage_cost: number;
  origin_airport: string;
  destination_airport: string;
  aircraft: string[];
  flight_numbers: string;
  departs_at: string;
  cabin: string;
  arrives_at: string;
  updated_at: string;
  created_at: string;
  search_date: string;
}

interface LufthansaRoute {
  route: string;
  date: string;
  itinerary: string[];
  totalDuration: number;
  departureTime: string;
  arrivalTime: string;
  connections: string[];
  classPercentages: {
    y: number;
    w: number;
    j: number;
    f: number;
  };
  f1: number | null;
  y2: number | null;
  j2: number | null;
  f2: number | null;
  y3: number | null;
  j3: number | null;
  f3: number | null;
  totalRouteDistance: number;
  segmentDistances: number[];
  flights?: Record<string, any>;
}

export default function LufthansaSkiplagPage() {
  const [flights, setFlights] = useState<LufthansaFlight[]>([]);
  const [koreanAirFlights, setKoreanAirFlights] = useState<LufthansaRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [koreanAirLoading, setKoreanAirLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('mileage_cost');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [europeFilter, setEuropeFilter] = useState<string>('any');
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [selectedKoreanAirClasses, setSelectedKoreanAirClasses] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [koreanAirCurrentPage, setKoreanAirCurrentPage] = useState(1);
  const [koreanAirSearchTerm, setKoreanAirSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const PAGE_SIZE = 10;
  const KOREAN_AIR_PAGE_SIZE = 10;

  useEffect(() => {
    fetchFlights();
  }, []);

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);
      
              const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('lufthansa_flights')
          .select('*')
          .order('departs_at', { ascending: true });

      if (error) {
        throw error;
      }

      setFlights(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch flights');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateDuration = (departDate: string, arriveDate: string) => {
    try {
      const depart = new Date(departDate);
      const arrive = new Date(arriveDate);
      const diffMs = arrive.getTime() - depart.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes;
    } catch (error) {
      return 0;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      // Extract time from UTC string without timezone conversion
      const match = dateString.match(/(\d{2}):(\d{2}):\d{2}/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const getDateDifference = (departDate: string, arriveDate: string) => {
    try {
      // Try parseISO first, then fallback to new Date
      let depart, arrive;
      try {
        depart = parseISO(departDate);
        arrive = parseISO(arriveDate);
      } catch {
        depart = new Date(departDate);
        arrive = new Date(arriveDate);
      }
      
      // Get the date parts only (ignore time) to avoid timezone issues
      const departDateOnly = new Date(depart.getFullYear(), depart.getMonth(), depart.getDate());
      const arriveDateOnly = new Date(arrive.getFullYear(), arrive.getMonth(), arrive.getDate());
      
      const diffTime = arriveDateOnly.getTime() - departDateOnly.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      return 0;
    }
  };

  const getAirlineLogo = (flightNumber: string) => {
    return '/LH.png';
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

  // Build IATA to CityName map
  const iataToCity: Record<string, string> = {};
  (airportsData as any[]).forEach((airport: any) => {
    iataToCity[airport.IATA] = airport.CityName;
  });

  const filteredFlights = flights.filter(flight => {
    const matchesSearch = 
      flight.origin_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.destination_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.flight_numbers.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = (() => {
      if (!date?.from) return true;
      const flightDate = new Date(flight.departs_at);
      const fromDate = date.from;
      const toDate = date.to || date.from;
      
      return flightDate >= fromDate && flightDate <= toDate;
    })();

    // Europe filtering
    const matchesEuropeFilter = (() => {
      if (europeFilter === 'any') return true;
      
      const originAirport = (airportsData as any[]).find((airport: any) => airport.IATA === flight.origin_airport);
      const destinationAirport = (airportsData as any[]).find((airport: any) => airport.IATA === flight.destination_airport);
      
      if (europeFilter === 'from_europe') {
        return originAirport?.copazone === 'Europe';
      }
      
      if (europeFilter === 'to_europe') {
        return destinationAirport?.copazone === 'Europe';
      }
      
      return true;
    })();

    // Selected flight filtering
    const matchesSelectedFlight = selectedFlight ? flight.id === selectedFlight : true;
    
    return matchesSearch && matchesDateRange && matchesEuropeFilter && matchesSelectedFlight;
  });

  const sortedFlights = [...filteredFlights].sort((a, b) => {
    switch (sortBy) {
      case 'departs_at':
        return new Date(a.departs_at).getTime() - new Date(b.departs_at).getTime();
      case 'mileage_cost':
        return (a.mileage_cost || 0) - (b.mileage_cost || 0);
      case 'remaining_seats':
        return b.remaining_seats - a.remaining_seats;
      case 'total_duration':
        return a.total_duration - b.total_duration;
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedFlights.length / PAGE_SIZE);
  const paginatedFlights = sortedFlights.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page + 1);
  };

  const handleExpandToggle = (flightId: string) => {
    setExpandedId(expandedId === flightId ? null : flightId);
  };

  const handleFlightSelect = (flightId: string) => {
    setSelectedFlight(selectedFlight === flightId ? null : flightId);
    setCurrentPage(1); // Reset to first page when selecting/deselecting
    setKoreanAirCurrentPage(1); // Reset Korean Air pagination when selecting new flight
    
    // If selecting a flight, call the Korean Air API
    if (selectedFlight !== flightId) {
      const selectedFlightData = flights.find(flight => flight.id === flightId);
      if (selectedFlightData) {
        callKoreanAirAPI(selectedFlightData);
      }
    } else {
      // If deselecting (selectedFlight === flightId), clear Korean Air flights and selection
      setKoreanAirFlights([]);
      setSelectedKoreanAirClasses(new Set());
    }
  };

  const callKoreanAirAPI = async (flightData: LufthansaFlight) => {
    try {
      setKoreanAirLoading(true);
      
      const requestBody = {
        O: flightData.origin_airport,
        D: flightData.destination_airport,
        T: flightData.arrives_at
      };
      
      const response = await fetch('https://api.bbairtools.com/api/LH-F-outbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Lufthansa API response:', data);
      
      // Store the Lufthansa routes data with flights
      if (data.itineraries && Array.isArray(data.itineraries)) {
        // Add flights data to each itinerary
        const itinerariesWithFlights = data.itineraries.map((itinerary: any) => ({
          ...itinerary,
          flights: data.flights || {}
        }));
        setKoreanAirFlights(itinerariesWithFlights);
      } else {
        setKoreanAirFlights([]);
      }
      
    } catch (error) {
      console.error('Error calling Lufthansa API:', error);
      setKoreanAirFlights([]);
    } finally {
      setKoreanAirLoading(false);
    }
  };

  const calculateMinValue = (route: LufthansaRoute, flightIndex: number) => {
    const f1 = route.f1 || 0;
    const y2 = route.y2 || 0;
    const j2 = route.j2 || 0;
    const f2 = route.f2 || 0;
    const y3 = route.y3 || 0;
    const j3 = route.j3 || 0;
    const f3 = route.f3 || 0;
    
    // Check if segments are selected
    const segment0Selected = selectedKoreanAirClasses.has(`${flightIndex}-0-economy`) || selectedKoreanAirClasses.has(`${flightIndex}-0-business`) || selectedKoreanAirClasses.has(`${flightIndex}-0-first`);
    const segment1Selected = selectedKoreanAirClasses.has(`${flightIndex}-1-economy`) || selectedKoreanAirClasses.has(`${flightIndex}-1-business`) || selectedKoreanAirClasses.has(`${flightIndex}-1-first`);
    
    // If all segments are selected, return null to hide "From"
    if (segment0Selected && segment1Selected) {
      return null;
    }
    
    let segment2Value = 0;
    let segment3Value = 0;
    
    // Calculate segment 2 value (FRA-MUC)
    if (segment0Selected) {
      // Use selected class for segment 0
      if (selectedKoreanAirClasses.has(`${flightIndex}-0-economy`)) {
        segment2Value = y2;
      } else if (selectedKoreanAirClasses.has(`${flightIndex}-0-business`)) {
        segment2Value = j2;
      } else if (selectedKoreanAirClasses.has(`${flightIndex}-0-first`)) {
        segment2Value = f2;
      }
    } else {
      // Use min value for segment 0
      const min2 = [y2, j2, f2].filter(val => val > 0);
      segment2Value = min2.length > 0 ? Math.min(...min2) : 0;
    }
    
    // Calculate segment 3 value (MUC-CDG)
    if (segment1Selected) {
      // Use selected class for segment 1
      if (selectedKoreanAirClasses.has(`${flightIndex}-1-economy`)) {
        segment3Value = y3;
      } else if (selectedKoreanAirClasses.has(`${flightIndex}-1-business`)) {
        segment3Value = j3;
      } else if (selectedKoreanAirClasses.has(`${flightIndex}-1-first`)) {
        segment3Value = f3;
      }
    } else {
      // Use min value for segment 1
      const min3 = [y3, j3, f3].filter(val => val > 0);
      segment3Value = min3.length > 0 ? Math.min(...min3) : 0;
    }
    
    return f1 + segment2Value + segment3Value;
  };

  // Korean Air pagination with search
  const filteredKoreanAirFlights = koreanAirFlights.filter(flight => {
    if (!koreanAirSearchTerm) return true;
    
    const searchLower = koreanAirSearchTerm.toLowerCase();
    const routeLower = flight.route.toLowerCase();
    
    // Search in route (e.g., "FRA-MUC-OPO")
    if (routeLower.includes(searchLower)) return true;
    
    // Search in airport codes
    const airports = flight.route.split('-');
    if (airports.some(airport => airport.toLowerCase().includes(searchLower))) return true;
    
    // Search in city names
    const cityNames = airports.map(airport => {
      const airportData = (airportsData as any[]).find((a: any) => a.IATA === airport);
      return airportData?.CityName || airport;
    });
    if (cityNames.some(city => city.toLowerCase().includes(searchLower))) return true;
    
    return false;
  });
  
  const sortedKoreanAirFlights = [...filteredKoreanAirFlights].sort((a, b) => {
    const aValue = calculateMinValue(a, 0) || 0;
    const bValue = calculateMinValue(b, 0) || 0;
    return aValue - bValue;
  });
  const koreanAirTotalPages = Math.ceil(sortedKoreanAirFlights.length / KOREAN_AIR_PAGE_SIZE);
  const paginatedKoreanAirFlights = sortedKoreanAirFlights.slice(
    (koreanAirCurrentPage - 1) * KOREAN_AIR_PAGE_SIZE,
    koreanAirCurrentPage * KOREAN_AIR_PAGE_SIZE
  );

  const handleKoreanAirPageChange = (page: number) => {
    setKoreanAirCurrentPage(page + 1);
  };

  const handleKoreanAirClassSelect = (flightIndex: number, segmentIndex: number, className: string) => {
    const classKey = `${flightIndex}-${segmentIndex}-${className}`;
    setSelectedKoreanAirClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classKey)) {
        newSet.delete(classKey);
      } else {
        // Remove any existing selection for this segment
        Array.from(newSet).forEach(key => {
          if (key.startsWith(`${flightIndex}-${segmentIndex}-`)) {
            newSet.delete(key);
          }
        });
        newSet.add(classKey);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto px-2 py-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading Lufthansa flights...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1000px] mx-auto px-2 py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Flights</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchFlights}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6">
      {/* Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="flex flex-col justify-center">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">
              Search
            </label>
            <Input
              placeholder="Search by airport or flight number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400"
            />
          </div>

          {/* Date Range */}
          <div className="flex flex-col justify-center">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">
              Date Range
            </label>
            <Popover open={open} onOpenChange={setOpen}>
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
                  toDate={addYears(new Date(), 1)}
                  onMonthChange={setCurrentMonth}
                  onSelect={(range) => {
                    setDate(range);
                    if (range?.from && range?.to) setOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Europe Filter */}
          <div className="flex flex-col justify-center">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">
              Direction
            </label>
            <Select value={europeFilter} onValueChange={setEuropeFilter}>
              <SelectTrigger className="w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                <SelectValue placeholder="Europe Route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="from_europe">From Europe</SelectItem>
                <SelectItem value="to_europe">To Europe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Sort By - Outside the card */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">
          Sort By
        </label>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="departs_at">Departure Date</SelectItem>
            <SelectItem value="mileage_cost">Mileage Cost</SelectItem>
            <SelectItem value="remaining_seats">Available Seats</SelectItem>
            <SelectItem value="total_duration">Flight Duration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Age Notification */}
      {(() => {
        if (flights.length === 0) return null;
        
        // Find the most recent created_at timestamp
        const mostRecentCreatedAt = flights.reduce((latest, flight) => {
          const flightCreatedAt = new Date(flight.created_at);
          return flightCreatedAt > latest ? flightCreatedAt : latest;
        }, new Date(0));
        
        const now = new Date();
        const ageInHours = (now.getTime() - mostRecentCreatedAt.getTime()) / (1000 * 60 * 60);
        
        if (ageInHours > 1) {
          const ageInMinutes = Math.floor(ageInHours * 60);
          const ageInHoursFloor = Math.floor(ageInHours);
          
          return (
            <div className="mb-6">
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <h3 className="font-semibold text-orange-800">Data May Be Outdated</h3>
                      </div>
                      <p className="text-sm text-orange-700 mb-3">
                        This flight data was last updated{' '}
                        {ageInHoursFloor > 0 
                          ? `${ageInHoursFloor} hour${ageInHoursFloor > 1 ? 's' : ''} and ${ageInMinutes % 60} minute${ageInMinutes % 60 !== 1 ? 's' : ''} ago`
                          : `${ageInMinutes} minute${ageInMinutes !== 1 ? 's' : ''} ago`
                        }. 
                        For the most current availability, consider refreshing the data.
                      </p>
                      <Button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            const response = await fetch('https://api.bbairtools.com/api/seats-aero-lufthansa');
                            if (response.ok) {
                              // Wait a moment for the database to update, then refetch
                              setTimeout(() => {
                                fetchFlights();
                              }, 3000);
                            }
                          } catch (error) {
                            console.error('Error refreshing data:', error);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        Refresh Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }
        
        return null;
      })()}

      {/* Flight Cards */}
      <div className="flex flex-col gap-4">
        {paginatedFlights.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No flights found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          paginatedFlights.map((flight) => {
            const isExpanded = expandedId === flight.id;
            return (
              <Card key={flight.id} className={`rounded-xl border bg-card shadow transition-all ${
                selectedFlight === flight.id ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}>
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                    <span className="font-semibold text-lg text-primary">
                      {flight.origin_airport} → {flight.destination_airport}
                    </span>
                    <span className="text-muted-foreground text-sm md:ml-4">
                      {formatDate(flight.departs_at)}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-6 mt-2 md:mt-0 ml-auto">
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap">
                        {formatDuration(flight.total_duration)}
                      </span>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-sm font-medium">
                          {formatTime(flight.departs_at)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm font-medium">
                          {formatTime(flight.arrives_at)}
                          {(() => {
                            const diff = getDateDifference(flight.departs_at, flight.arrives_at);
                            return diff > 0 ? (
                              <span className="text-xs text-muted-foreground ml-1">(+{diff})</span>
                            ) : null;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExpandToggle(flight.id)}
                    className="ml-2 p-1 hover:bg-muted rounded transition-colors self-start md:self-center"
                    aria-label={isExpanded ? "Collapse details" : "Expand details"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CardContent>
                <div className="px-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="flex items-center gap-1">
                      <Image
                        src={getAirlineLogo(flight.flight_numbers)}
                        alt="Lufthansa"
                        width={24}
                        height={24}
                        className="inline-block align-middle rounded-md"
                        style={{ objectFit: 'contain' }}
                      />
                      <span className="font-mono">{flight.flight_numbers}</span>
                      <button
                        onClick={() => handleFlightSelect(flight.id)}
                        disabled={(() => {
                          const originAirport = (airportsData as any[]).find((airport: any) => airport.IATA === flight.origin_airport);
                          return originAirport?.copazone === 'Europe';
                        })()}
                        className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                          selectedFlight === flight.id
                            ? 'bg-primary text-primary-foreground'
                            : (() => {
                                const originAirport = (airportsData as any[]).find((airport: any) => airport.IATA === flight.origin_airport);
                                return originAirport?.copazone === 'Europe'
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                              })()
                        }`}
                        aria-label={selectedFlight === flight.id ? "Deselect flight" : "Select flight"}
                      >
                        {(() => {
                          const originAirport = (airportsData as any[]).find((airport: any) => airport.IATA === flight.origin_airport);
                          if (originAirport?.copazone === 'Europe') {
                            return 'Disabled';
                          }
                          return selectedFlight === flight.id ? 'Selected' : 'Select';
                        })()}
                      </button>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-sm font-medium flex items-center gap-4">
                                              <span className="flex items-center gap-1">
                          Seats:
                          <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#D88A3F', color: '#222' }}>
                            {flight.remaining_seats === 0 ? 'N/A' : flight.remaining_seats}
                          </span>
                        </span>
                      <span className="flex items-center gap-2">
                        First:
                        <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#D88A3F', color: '#222' }}>
                          {(flight.mileage_cost || 0).toLocaleString()}
                        </span>
                        <span className="font-mono text-sm">
                          miles
                        </span>
                      </span>
                    </span>
                  </div>
                </div>
                <ExpandFade show={isExpanded}>
                  <>
                    <div className="w-full flex justify-center my-2">
                      <div className="h-px w-full bg-muted" />
                    </div>
                    <div className="px-6 pb-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-1 md:gap-0">
                            <div className="flex flex-col w-full md:flex-row md:items-center md:gap-6">
                              <div className="flex items-center gap-2 w-full md:w-auto">
                                <span className="font-semibold text-primary break-words whitespace-normal">
                                  {iataToCity[flight.origin_airport] || flight.origin_airport} ({flight.origin_airport}) → {iataToCity[flight.destination_airport] || flight.destination_airport} ({flight.destination_airport})
                                </span>
                              </div>
                              <div className="flex flex-row justify-between items-center w-full md:w-auto mt-1 md:mt-0 md:ml-auto md:gap-6">
                                <span className="text-sm font-mono text-muted-foreground font-bold">
                                  {formatDuration(flight.total_duration)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {formatTime(flight.departs_at)}
                                  </span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-sm font-medium">
                                    {formatTime(flight.arrives_at)}
                                    {(() => {
                                      const diff = getDateDifference(flight.departs_at, flight.arrives_at);
                                      return diff > 0 ? (
                                        <span className="text-xs text-muted-foreground ml-1">(+{diff})</span>
                                      ) : null;
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row items-center gap-2 mt-1">
                            <Image
                              src={getAirlineLogo(flight.flight_numbers)}
                              alt="Lufthansa"
                              width={20}
                              height={20}
                              className="inline-block align-middle rounded-md"
                              style={{ objectFit: 'contain' }}
                            />
                            <span className="font-mono text-sm">{flight.flight_numbers}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({flight.aircraft.join(', ')})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                </ExpandFade>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center mt-8">
        <Pagination
          currentPage={currentPage - 1}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Korean Air Flights Section */}
      {(koreanAirFlights.length > 0 || koreanAirLoading) && (
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">"Dumping" Flights</h2>
            <p className="text-gray-600 dark:text-gray-300">Available selected "dumping" flights for the selected date</p>
          </div>
          
          {/* Search Bar */}
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search routes, airports, or cities (e.g., FRA, Munich, OPO)"
              value={koreanAirSearchTerm}
              onChange={(e) => {
                setKoreanAirSearchTerm(e.target.value);
                setKoreanAirCurrentPage(1); // Reset to first page when searching
              }}
              className="max-w-md"
            />
          </div>
          
          {koreanAirLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading Lufthansa routes...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {paginatedKoreanAirFlights.map((flight, index) => {
                const isExpanded = expandedId === `korean-${index}`;
                
                // Check if any segment of this flight is selected
                const isAnySegmentSelected = flight.itinerary && flight.itinerary.some((_, segmentIndex) => {
                  const economyKey = `${index}-${segmentIndex}-economy`;
                  const businessKey = `${index}-${segmentIndex}-business`;
                  const firstKey = `${index}-${segmentIndex}-first`;
                  return selectedKoreanAirClasses.has(economyKey) || selectedKoreanAirClasses.has(businessKey) || selectedKoreanAirClasses.has(firstKey);
                });
                
                // Filter logic: if any segment is selected, only show that specific flight
                const shouldShowFlight = selectedKoreanAirClasses.size === 0 || isAnySegmentSelected;
                
                // If no flight should be shown, don't render this card
                if (!shouldShowFlight) {
                  return null;
                }
                
                                  return (
                    <Card key={`korean-${index}`} className={`rounded-xl border bg-card shadow transition-all cursor-pointer ${
                      isAnySegmentSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}>
                      <div onClick={() => handleExpandToggle(`korean-${index}`)} className="flex items-center justify-between">
                        <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
                          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                            <span className="font-semibold text-lg text-primary">{flight.route}</span>
                            <span className="text-muted-foreground text-sm md:ml-4">{formatDate(flight.date)}</span>
                          </div>
                          <div className="flex flex-col md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-6 mt-2 md:mt-0 ml-auto">
                            <div className="flex items-center gap-6">
                              <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap">{formatDuration(flight.totalDuration)}</span>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-sm font-medium">{formatTime(flight.departureTime)}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-sm font-medium">
                                  {formatTime(flight.arrivalTime)}
                                  {getDateDifference(flight.departureTime, flight.arrivalTime) > 0 && (
                                    <span className="text-xs text-muted-foreground ml-1">(+{getDateDifference(flight.departureTime, flight.arrivalTime)})</span>
                                  )}
                                </span>
                              </div>
                            </div>
                            <span className="self-end md:self-center">
                              {isExpanded ? (
                                <svg className="h-5 w-5 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                              ) : (
                                <svg className="h-5 w-5 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                              )}
                            </span>
                          </div>
                        </CardContent>
                      </div>
                      <div className="px-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
                        <div className="flex flex-wrap gap-2 items-center">
                          {flight.itinerary && flight.itinerary.map((itineraryItem, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <Image
                                src="/LH.png"
                                alt="Lufthansa"
                                width={24}
                                height={24}
                                className="inline-block align-middle rounded-md"
                                style={{ objectFit: 'contain' }}
                              />
                              <span className="font-mono">{itineraryItem.split('-')[0]}</span>
                              {i < flight.itinerary.length - 1 && <span className="mx-1 text-muted-foreground">/</span>}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-4 items-center">
                          <span className="text-sm font-medium flex items-center gap-4">
                            {(() => {
                              const minValue = calculateMinValue(flight, index);
                              if (minValue === null) {
                                return null; // Hide "From" when all segments are selected
                              }
                              return (
                                <span className="flex items-center gap-2">
                                  From:
                                  <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#D88A3F', color: '#222' }}>
                                    {minValue.toLocaleString()}
                                  </span>
                                  <span className="font-mono text-sm">
                                    miles
                                  </span>
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                      </div>
                    <ExpandFade show={isExpanded}>
                      <>
                        <div className="w-full flex justify-center my-2">
                          <div className="h-px w-full bg-muted" />
                        </div>
                        <div className="px-6 pb-4">
                          <div className="flex flex-col gap-3">
                            {flight.itinerary && flight.itinerary.map((itineraryItem, i) => {
                              // Get the flight data using the itinerary item as key
                              const flightData = flight.flights?.[itineraryItem];
                              const flightNumber = flightData?.FlightNumbers || itineraryItem.split('-')[0];
                              
                              // Get the correct airports for each segment
                              let fromAirport, toAirport;
                              if (i === 0) {
                                // First segment: from origin to first connection (or destination if no connections)
                                fromAirport = flight.route.split('-')[0];
                                toAirport = flight.connections.length > 0 ? flight.connections[0] : flight.route.split('-')[1];
                              } else if (i === flight.itinerary.length - 1) {
                                // Last segment: from last connection to destination
                                fromAirport = flight.connections[flight.connections.length - 1];
                                toAirport = flight.route.split('-')[flight.route.split('-').length - 1];
                              } else {
                                // Middle segments: between connections
                                fromAirport = flight.connections[i - 1];
                                toAirport = flight.connections[i];
                              }
                              
                              // Get city names for airports
                              const fromCity = (airportsData as any[]).find((airport: any) => airport.IATA === fromAirport)?.CityName || fromAirport;
                              const toCity = (airportsData as any[]).find((airport: any) => airport.IATA === toAirport)?.CityName || toAirport;
                              const segmentPath = `${fromCity} (${fromAirport}) → ${toCity} (${toAirport})`;
                              
                              // Calculate layover if not the first segment
                              let layoverNode = null;
                              if (i > 0) {
                                const prevItem = flight.itinerary[i - 1];
                                const prevFlightData = flight.flights?.[prevItem];
                                
                                if (prevFlightData && flightData) {
                                  const prevArrive = new Date(prevFlightData.ArrivesAt).getTime();
                                  const currDepart = new Date(flightData.DepartsAt).getTime();
                                  const diffMin = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
                                  if (diffMin > 0) {
                                    layoverNode = (
                                      <div className="flex items-center w-full my-2">
                                        <div className="flex-1 h-px bg-muted" />
                                        <span className="mx-3 text-xs text-muted-foreground font-mono">
                                          Layover at {fromCity} ({fromAirport}) for {formatDuration(diffMin)}
                                        </span>
                                        <div className="flex-1 h-px bg-muted" />
                                      </div>
                                    );
                                  }
                                }
                              }
                              
                              return (
                                <div key={i} className="flex flex-col gap-1">
                                  {layoverNode}
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-1 md:gap-0">
                                    <div className="flex flex-col w-full md:flex-row md:items-center md:gap-6">
                                      <div className="flex items-center gap-2 w-full md:w-auto">
                                        <span className="font-semibold text-primary break-words whitespace-normal">{segmentPath}</span>
                                      </div>
                                      <div className="flex flex-row justify-between items-center w-full md:w-auto mt-1 md:mt-0 md:ml-auto md:gap-6">
                                        <span className="text-sm font-mono text-muted-foreground font-bold">{formatDuration(flightData?.TotalDuration || flight.totalDuration)}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">{formatTime(flightData?.DepartsAt || flight.departureTime)}</span>
                                          <span className="text-muted-foreground">→</span>
                                          <span className="text-sm font-medium">{formatTime(flightData?.ArrivesAt || flight.arrivalTime)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1 gap-2">
                                    <div className="flex flex-row items-center gap-2">
                                      <Image
                                        src="/LH.png"
                                        alt="Lufthansa"
                                        width={20}
                                        height={20}
                                        className="inline-block align-middle rounded-md"
                                        style={{ objectFit: 'contain' }}
                                      />
                                      <span className="font-mono text-sm">{flightNumber}</span>
                                      {flightData?.Aircraft && (
                                        <span className="text-xs text-muted-foreground ml-1">({flightData.Aircraft})</span>
                                      )}
                                    </div>
                                    {/* Pricing positioned at bottom right */}
                                    <div className="flex flex-col items-start sm:items-end gap-1">
                                      {/* Economy pricing */}
                                      {((i === 0 && flight.y2) || (i === 1 && flight.y3)) && 
                                       !selectedKoreanAirClasses.has(`${index}-${i}-business`) && 
                                       !selectedKoreanAirClasses.has(`${index}-${i}-first`) && (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleKoreanAirClassSelect(index, i, 'economy')}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                              selectedKoreanAirClasses.has(`${index}-${i}-economy`)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                            }`}
                                            aria-label={selectedKoreanAirClasses.has(`${index}-${i}-economy`) ? "Deselect Economy" : "Select Economy"}
                                          >
                                            {selectedKoreanAirClasses.has(`${index}-${i}-economy`) ? 'Selected' : 'Select'}
                                          </button>
                                          <span className="text-sm font-medium">Economy:</span>
                                          <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#E8E1F2', color: '#222' }}>
                                            {i === 0 ? (flight.y2 || 0).toLocaleString() : (flight.y3 || 0).toLocaleString()}
                                          </span>
                                          <span className="font-mono text-sm">miles</span>
                                        </div>
                                      )}
                                      {/* Business pricing */}
                                      {((i === 0 && flight.j2) || (i === 1 && flight.j3)) && 
                                       !selectedKoreanAirClasses.has(`${index}-${i}-economy`) && 
                                       !selectedKoreanAirClasses.has(`${index}-${i}-first`) && (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleKoreanAirClassSelect(index, i, 'business')}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                              selectedKoreanAirClasses.has(`${index}-${i}-business`)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                            }`}
                                            aria-label={selectedKoreanAirClasses.has(`${index}-${i}-business`) ? "Deselect Business" : "Select Business"}
                                          >
                                            {selectedKoreanAirClasses.has(`${index}-${i}-business`) ? 'Selected' : 'Select'}
                                          </button>
                                          <span className="text-sm font-medium">Business:</span>
                                          <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#F3CD87', color: '#222' }}>
                                            {i === 0 ? (flight.j2 || 0).toLocaleString() : (flight.j3 || 0).toLocaleString()}
                                          </span>
                                          <span className="font-mono text-sm">miles</span>
                                        </div>
                                      )}
                                      {/* First pricing */}
                                      {((i === 0 && flight.f2) || (i === 1 && flight.f3)) && 
                                       !selectedKoreanAirClasses.has(`${index}-${i}-economy`) && 
                                       !selectedKoreanAirClasses.has(`${index}-${i}-business`) && (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleKoreanAirClassSelect(index, i, 'first')}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                              selectedKoreanAirClasses.has(`${index}-${i}-first`)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                            }`}
                                            aria-label={selectedKoreanAirClasses.has(`${index}-${i}-first`) ? "Deselect First" : "Select First"}
                                          >
                                            {selectedKoreanAirClasses.has(`${index}-${i}-first`) ? 'Selected' : 'Select'}
                                          </button>
                                          <span className="text-sm font-medium">First:</span>
                                          <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#D88A3F', color: '#222' }}>
                                            {i === 0 ? (flight.f2 || 0).toLocaleString() : (flight.f3 || 0).toLocaleString()}
                                          </span>
                                          <span className="font-mono text-sm">miles</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    </ExpandFade>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Korean Air Pagination - Only show when not both flights are selected */}
          {(!selectedFlight || selectedKoreanAirClasses.size === 0) && (
            <div className="flex justify-center items-center mt-8">
              <Pagination
                currentPage={koreanAirCurrentPage - 1}
                totalPages={koreanAirTotalPages}
                onPageChange={handleKoreanAirPageChange}
              />
            </div>
          )}

          {/* Combined Booking Section - Only show when both Delta and Korean Air are selected */}
          {selectedFlight && selectedKoreanAirClasses.size > 0 && (
            <div className="mt-8">
              <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Combined Booking</h2>
        <p className="text-gray-600 dark:text-gray-300">Book your complete itinerary with Lufthansa</p>
              </div>
              
              <Card className="rounded-xl border bg-card shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    {/* Selected Flights Summary */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Selected Flights</h3>
                      
                      {/* IAH-FRA Flight */}
                      {(() => {
                        const selectedDeltaFlight = flights.find(f => f.id === selectedFlight);
                        const selectedClassKeys = Array.from(selectedKoreanAirClasses);
                        if (!selectedDeltaFlight || selectedClassKeys.length === 0) return null;
                        
                        const [firstKey] = selectedClassKeys;
                        const [flightIndex] = firstKey.split('-');
                        const selectedKoreanFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
                        if (!selectedKoreanFlight) return null;
                        
                        return (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <Image
                              src={getAirlineLogo(selectedDeltaFlight.flight_numbers)}
                              alt="Lufthansa"
                              width={20}
                              height={20}
                              className="rounded-md"
                              style={{ objectFit: 'contain' }}
                            />
                            <div className="flex-1">
                              <div className="font-medium dark:text-gray-100">
                                {(() => {
                                  const originCity = (airportsData as any[]).find((airport: any) => airport.IATA === selectedDeltaFlight.origin_airport)?.CityName || selectedDeltaFlight.origin_airport;
                                  const destinationCity = (airportsData as any[]).find((airport: any) => airport.IATA === selectedDeltaFlight.destination_airport)?.CityName || selectedDeltaFlight.destination_airport;
                                  return `${originCity} (${selectedDeltaFlight.origin_airport}) → ${destinationCity} (${selectedDeltaFlight.destination_airport})`;
                                })()}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(selectedDeltaFlight.departs_at)} • {selectedDeltaFlight.flight_numbers}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium dark:text-gray-100">{(selectedKoreanFlight.f1 || 0).toLocaleString()} miles</div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Korean Air Segments */}
                      {(() => {
                        const selectedClassKeys = Array.from(selectedKoreanAirClasses);
                        if (selectedClassKeys.length === 0) return null;
                        
                        const [firstKey] = selectedClassKeys;
                        const [flightIndex] = firstKey.split('-');
                        const selectedKoreanFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
                        if (!selectedKoreanFlight) return null;
                        
                        return selectedClassKeys.map((classKey, idx) => {
                          const [_, segmentIndex, className] = classKey.split('-');
                          const segmentIdx = parseInt(segmentIndex);
                          
                          // Get segment airports
                          let fromAirport, toAirport;
                          if (segmentIdx === 0) {
                            fromAirport = selectedKoreanFlight.route.split('-')[0];
                            toAirport = selectedKoreanFlight.connections.length > 0 ? selectedKoreanFlight.connections[0] : selectedKoreanFlight.route.split('-')[1];
                          } else {
                            fromAirport = selectedKoreanFlight.connections[selectedKoreanFlight.connections.length - 1];
                            toAirport = selectedKoreanFlight.route.split('-')[selectedKoreanFlight.route.split('-').length - 1];
                          }
                          
                          // Get city names
                          const fromCity = (airportsData as any[]).find((airport: any) => airport.IATA === fromAirport)?.CityName || fromAirport;
                          const toCity = (airportsData as any[]).find((airport: any) => airport.IATA === toAirport)?.CityName || toAirport;
                          
                                                        // Get pricing based on segment and class
                              let miles = 0;
                              if (segmentIdx === 0) {
                                if (className === 'economy') {
                                  miles = selectedKoreanFlight.y2 || 0;
                                } else if (className === 'business') {
                                  miles = selectedKoreanFlight.j2 || 0;
                                } else if (className === 'first') {
                                  miles = selectedKoreanFlight.f2 || 0;
                                }
                              } else {
                                if (className === 'economy') {
                                  miles = selectedKoreanFlight.y3 || 0;
                                } else if (className === 'business') {
                                  miles = selectedKoreanFlight.j3 || 0;
                                } else if (className === 'first') {
                                  miles = selectedKoreanFlight.f3 || 0;
                                }
                              }
                          
                          return (
                            <div key={classKey} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                              <Image
                                src="/LH.png"
                                alt="Lufthansa"
                                width={20}
                                height={20}
                                className="rounded-md"
                                style={{ objectFit: 'contain' }}
                              />
                              <div className="flex-1">
                                <div className="font-medium dark:text-gray-100">
                                  {fromCity} ({fromAirport}) → {toCity} ({toAirport})
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatDate(selectedKoreanFlight.date)} • {(() => {
                                    const flightData = selectedKoreanFlight.flights?.[selectedKoreanFlight.itinerary[segmentIdx]];
                                    return flightData?.FlightNumbers || 'LH Flight';
                                  })()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium dark:text-gray-100">{miles.toLocaleString()} miles</div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    
                    {/* Total Calculation */}
                    <div className="border-t dark:border-gray-700 pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-lg dark:text-white">Total</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {(() => {
                              const selectedDeltaFlight = flights.find(f => f.id === selectedFlight);
                              const selectedClassKeys = Array.from(selectedKoreanAirClasses);
                              if (selectedClassKeys.length === 0) return '';
                              
                              const [firstKey] = selectedClassKeys;
                              const [flightIndex] = firstKey.split('-');
                              const selectedKoreanFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
                              
                              if (!selectedDeltaFlight || !selectedKoreanFlight) return '';
                              
                              // Calculate total Korean Air miles from selected segments
                              let koreanTotalMiles = 0;
                              selectedClassKeys.forEach(classKey => {
                                const [_, segmentIndex, className] = classKey.split('-');
                                const segmentIdx = parseInt(segmentIndex);
                                
                                if (segmentIdx === 0) {
                                  if (className === 'economy') {
                                    koreanTotalMiles += selectedKoreanFlight.y2 || 0;
                                  } else if (className === 'business') {
                                    koreanTotalMiles += selectedKoreanFlight.j2 || 0;
                                  } else if (className === 'first') {
                                    koreanTotalMiles += selectedKoreanFlight.f2 || 0;
                                  }
                                } else {
                                  if (className === 'economy') {
                                    koreanTotalMiles += selectedKoreanFlight.y3 || 0;
                                  } else if (className === 'business') {
                                    koreanTotalMiles += selectedKoreanFlight.j3 || 0;
                                  } else if (className === 'first') {
                                    koreanTotalMiles += selectedKoreanFlight.f3 || 0;
                                  }
                                }
                              });
                              
                              const totalMiles = (selectedKoreanFlight.f1 || 0) + koreanTotalMiles;
                              
                              return (
                                <>
                                  {totalMiles.toLocaleString()} miles
                                  <span className="text-xs text-gray-500 dark:text-gray-400 align-super">*</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Note about mileage */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                      * LifeMiles pricing may vary slightly from displayed amounts
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 