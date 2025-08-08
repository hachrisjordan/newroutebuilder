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

interface VirginAtlanticFlight {
  TotalDuration: number;
  RemainingSeats: number;
  MileageCost: number;
  OriginAirport: string;
  DestinationAirport: string;
  Aircraft: string[];
  FlightNumbers: string;
  DepartsAt: string;
  Cabin: string;
  ArrivesAt: string;
  UpdatedAt: string;
  Source: string;
  virginatlantic: boolean;
  TotalTaxes: number;
  TaxesCurrency: string;
}

interface KoreanAirFlight {
  TotalTaxes: number;
  OriginAirport: string;
  DestinationAirport: string;
  Aircraft: string[];
  FlightNumbers: string;
  DepartsAt: string;
  ArrivesAt: string;
  UpdatedAt: string;
  economy: boolean;
  business: boolean;
  economySeats: number;
  economyMiles: number;
  businessSeats: number;
  businessMiles: number;
}

export default function VirginDumpingPage() {
  const [flights, setFlights] = useState<VirginAtlanticFlight[]>([]);
  const [koreanAirFlights, setKoreanAirFlights] = useState<KoreanAirFlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [koreanAirLoading, setKoreanAirLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('departs_at');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [europeFilter, setEuropeFilter] = useState<string>('any');
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [selectedKoreanAirClass, setSelectedKoreanAirClass] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [koreanAirCurrentPage, setKoreanAirCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const PAGE_SIZE = 10;
  const KOREAN_AIR_PAGE_SIZE = 10;

  // Removed automatic fetch - now user must click search button

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build API URL with parameters
      const params = new URLSearchParams();
      
      // Add direction parameter
      if (europeFilter !== 'any') {
        params.append('direction', europeFilter);
      }
      
      // Add date range parameters
      if (date?.from && date?.to) {
        params.append('start_date', format(date.from, 'yyyy-MM-dd'));
        params.append('end_date', format(date.to, 'yyyy-MM-dd'));
      }
      
      const apiUrl = `https://api.bbairtools.com/api/seats-aero-virginatlantic-vs?${params.toString()}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setFlights(data.trips || []);
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
      return format(parseISO(dateString), 'HH:mm');
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
    if (flightNumber.startsWith('DL')) {
      return '/DL.png';
    }
    return '/VS.png';
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

  // Currency conversion function for Saudi Airlines taxes
  const convertTaxToUSD = (taxAmount: number, originAirport: string, destinationAirport: string) => {
    // DXB-RUH: AED to USD (1 USD = 3.67 AED)
    if (originAirport === 'DXB' && destinationAirport === 'RUH') {
      return (taxAmount / 100) / 3.67; // Convert from AED to USD
    }
    // RUH-DXB: SAR to USD (1 USD = 3.75 SAR)
    if (originAirport === 'RUH' && destinationAirport === 'DXB') {
      return (taxAmount / 100) / 3.75; // Convert from SAR to USD
    }
    // Default: assume USD (divide by 100 for cents)
    return taxAmount / 100;
  };

  // Build IATA to CityName map
  const iataToCity: Record<string, string> = {};
  (airportsData as any[]).forEach((airport: any) => {
    iataToCity[airport.IATA] = airport.CityName;
  });

  const filteredFlights = flights.filter(flight => {
    const matchesSearch = 
      flight.OriginAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.DestinationAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.FlightNumbers.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = (() => {
      if (!date?.from) return true;
      const flightDate = new Date(flight.DepartsAt);
      const fromDate = date.from;
      const toDate = date.to || date.from;
      
      return flightDate >= fromDate && flightDate <= toDate;
    })();

    // Europe filtering
    const matchesEuropeFilter = (() => {
      if (europeFilter === 'any') return true;
      
      const originAirport = (airportsData as any[]).find((airport: any) => airport.IATA === flight.OriginAirport);
      const destinationAirport = (airportsData as any[]).find((airport: any) => airport.IATA === flight.DestinationAirport);
      
      if (europeFilter === 'from_europe') {
        return originAirport?.copazone === 'Europe';
      }
      
      if (europeFilter === 'to_europe') {
        return destinationAirport?.copazone === 'Europe';
      }
      
      return true;
    })();

    // Selected flight filtering - create unique identifier for each flight
    const flightUniqueId = `${flight.FlightNumbers}-${flight.DepartsAt}-${flight.OriginAirport}-${flight.DestinationAirport}`;
    const matchesSelectedFlight = selectedFlight ? flightUniqueId === selectedFlight : true;
    
    return matchesSearch && matchesDateRange && matchesEuropeFilter && matchesSelectedFlight;
  });

  const sortedFlights = [...filteredFlights].sort((a, b) => {
    switch (sortBy) {
      case 'departs_at':
        return new Date(a.DepartsAt).getTime() - new Date(b.DepartsAt).getTime();
      case 'mileage_cost':
        return a.MileageCost - b.MileageCost;
      case 'remaining_seats':
        return b.RemainingSeats - a.RemainingSeats;
      case 'total_duration':
        return a.TotalDuration - b.TotalDuration;
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
      // The flightId is the unique identifier, so we need to find the flight by reconstructing it
      const selectedFlightData = flights.find(flight => {
        const flightUniqueId = `${flight.FlightNumbers}-${flight.DepartsAt}-${flight.OriginAirport}-${flight.DestinationAirport}`;
        return flightUniqueId === flightId;
      });
      
      if (selectedFlightData) {
        callKoreanAirAPI(selectedFlightData.DepartsAt);
      }
    } else {
      // If deselecting (selectedFlight === flightId), clear Korean Air flights and selection
      setKoreanAirFlights([]);
      setSelectedKoreanAirClass(null);
    }
  };

  const callKoreanAirAPI = async (departureDate: string) => {
    try {
      setKoreanAirLoading(true);
      // Extract just the date part from the departure date
      const dateOnly = departureDate.split('T')[0]; // Get YYYY-MM-DD part
      
      const apiUrl = `https://api.bbairtools.com/api/seats-aero-saudiairlines?start_date=${dateOnly}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store all Saudi Airlines flights from the response
      if (data.trips && Array.isArray(data.trips) && data.trips.length > 0) {
        setKoreanAirFlights(data.trips); // Show all flights
      } else {
        setKoreanAirFlights([]);
      }
      
    } catch (error) {
      setKoreanAirFlights([]);
    } finally {
      setKoreanAirLoading(false);
    }
  };

  // Korean Air pagination
  const sortedKoreanAirFlights = [...koreanAirFlights].sort((a, b) => a.TotalTaxes - b.TotalTaxes);
  const koreanAirTotalPages = Math.ceil(sortedKoreanAirFlights.length / KOREAN_AIR_PAGE_SIZE);
  const paginatedKoreanAirFlights = sortedKoreanAirFlights.slice(
    (koreanAirCurrentPage - 1) * KOREAN_AIR_PAGE_SIZE,
    koreanAirCurrentPage * KOREAN_AIR_PAGE_SIZE
  );

  const handleKoreanAirPageChange = (page: number) => {
    setKoreanAirCurrentPage(page + 1);
  };

  const handleKoreanAirClassSelect = (flightIndex: number, className: string) => {
    const classKey = `${flightIndex}-${className}`;
    setSelectedKoreanAirClass(selectedKoreanAirClass === classKey ? null : classKey);
  };

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto px-2 py-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching Virgin Atlantic flights...</p>
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
      {/* Search Section */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Direction */}
          <div className="flex flex-col justify-center">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">
              Direction
            </label>
            <Select value={europeFilter} onValueChange={setEuropeFilter}>
              <SelectTrigger className="w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="from_europe">From Europe</SelectItem>
                <SelectItem value="to_europe">To Europe</SelectItem>
              </SelectContent>
            </Select>
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
                  toDate={addYears(new Date(), 1)}
                  onMonthChange={setCurrentMonth}
                  onSelect={(range) => {
                    setDate(range);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Search Button */}
          <div className="flex flex-col justify-end">
            <Button 
              onClick={fetchFlights}
              className="w-full"
            >
              Search
            </Button>
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
        
        // Find the most recent UpdatedAt timestamp
        const mostRecentUpdatedAt = flights.reduce((latest, flight) => {
          const flightUpdatedAt = new Date(flight.UpdatedAt);
          return flightUpdatedAt > latest ? flightUpdatedAt : latest;
        }, new Date(0));
        
        const now = new Date();
        const ageInHours = (now.getTime() - mostRecentUpdatedAt.getTime()) / (1000 * 60 * 60);
        
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
                            const response = await fetch('https://api.bbairtools.com/api/seats-aero-virginatlantic');
                            if (response.ok) {
                              // Wait a moment for the database to update, then refetch
                              setTimeout(() => {
                                fetchFlights();
                              }, 3000);
                            }
                          } catch (error) {
                            // Error handling without console logging
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
            const flightUniqueId = `${flight.FlightNumbers}-${flight.DepartsAt}-${flight.OriginAirport}-${flight.DestinationAirport}`;
            const isExpanded = expandedId === flightUniqueId;
            return (
              <Card key={flightUniqueId} className={`rounded-xl border bg-card shadow transition-all ${
                selectedFlight === flightUniqueId ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}>
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                    <span className="font-semibold text-lg text-primary">
                      {flight.OriginAirport} → {flight.DestinationAirport}
                    </span>
                    <span className="text-muted-foreground text-sm md:ml-4">
                      {formatDate(flight.DepartsAt)}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-6 mt-2 md:mt-0 ml-auto">
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap">
                        {formatDuration(flight.TotalDuration)}
                      </span>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-sm font-medium">
                          {formatTime(flight.DepartsAt)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm font-medium">
                          {formatTime(flight.ArrivesAt)}
                          {(() => {
                            const diff = getDateDifference(flight.DepartsAt, flight.ArrivesAt);
                            return diff > 0 ? (
                              <span className="text-xs text-muted-foreground ml-1">(+{diff})</span>
                            ) : null;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExpandToggle(flightUniqueId)}
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
                        src={getAirlineLogo(flight.FlightNumbers)}
                        alt={flight.FlightNumbers.startsWith('DL') ? 'Delta' : 'Virgin Atlantic'}
                        width={24}
                        height={24}
                        className="inline-block align-middle rounded-md"
                        style={{ objectFit: 'contain' }}
                      />
                      <span className="font-mono">{flight.FlightNumbers}</span>
                      <button
                        onClick={() => handleFlightSelect(flightUniqueId)}
                        className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                          selectedFlight === flightUniqueId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                        aria-label={selectedFlight === flightUniqueId ? "Deselect flight" : "Select flight"}
                      >
                        {selectedFlight === flightUniqueId ? 'Selected' : 'Select'}
                      </button>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-sm font-medium flex flex-col gap-2">
                      {/* Original pricing row - grayed out with strikethrough */}
                      <span className="flex items-center gap-4 text-gray-400 line-through">
                        <span className="flex items-center gap-1">
                          Seats:
                          <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#E5E7EB', color: '#6B7280' }}>
                            {flight.RemainingSeats}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          Business:
                          <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#E5E7EB', color: '#6B7280' }}>
                            {flight.MileageCost.toLocaleString()}
                          </span>
                          +
                          <span className="font-mono text-sm">
                            ${(flight.TotalTaxes / 100).toFixed(2)}
                          </span>
                        </span>
                      </span>
                      {/* Half points pricing row */}
                      <span className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          Seats:
                          <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#F3CD87', color: '#222' }}>
                            {flight.RemainingSeats}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          Business:
                          <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#F3CD87', color: '#222' }}>
                            {(flight.MileageCost / 2).toLocaleString()}
                          </span>
                          +
                          <span className="font-mono text-sm">
                            ${(flight.TotalTaxes / 100).toFixed(2)}
                          </span>
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
                                  {iataToCity[flight.OriginAirport] || flight.OriginAirport} ({flight.OriginAirport}) → {iataToCity[flight.DestinationAirport] || flight.DestinationAirport} ({flight.DestinationAirport})
                                </span>
                              </div>
                              <div className="flex flex-row justify-between items-center w-full md:w-auto mt-1 md:mt-0 md:ml-auto md:gap-6">
                                <span className="text-sm font-mono text-muted-foreground font-bold">
                                  {formatDuration(flight.TotalDuration)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {formatTime(flight.DepartsAt)}
                                  </span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-sm font-medium">
                                    {formatTime(flight.ArrivesAt)}
                                    {(() => {
                                      const diff = getDateDifference(flight.DepartsAt, flight.ArrivesAt);
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
                              src={getAirlineLogo(flight.FlightNumbers)}
                              alt={flight.FlightNumbers.startsWith('DL') ? 'Delta' : 'Virgin Atlantic'}
                              width={20}
                              height={20}
                              className="inline-block align-middle rounded-md"
                              style={{ objectFit: 'contain' }}
                            />
                            <span className="font-mono text-sm">{flight.FlightNumbers}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({flight.Aircraft.join(', ')})
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



      {/* Saudi Airlines Flights Section */}
      {(koreanAirFlights.length > 0 || koreanAirLoading) && (
        <div className="mt-12">
          <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">"Dumping" Flights</h2>
        <p className="text-gray-600 dark:text-gray-300">Available "dumping" flights for the selected date</p>
          </div>
          
          {koreanAirLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading "dumping" flights...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {paginatedKoreanAirFlights.map((flight, index) => {
                const isExpanded = expandedId === `korean-${index}`;
                const economyClassKey = `${index}-economy`;
                const businessClassKey = `${index}-business`;
                const isEconomySelected = selectedKoreanAirClass === economyClassKey;
                const isBusinessSelected = selectedKoreanAirClass === businessClassKey;
                
                // Filter logic: if a class is selected, only show that specific flight and class
                const selectedClassKey = selectedKoreanAirClass;
                const shouldShowFlight = !selectedClassKey || isEconomySelected || isBusinessSelected;
                const shouldShowEconomy = !selectedClassKey || isEconomySelected;
                const shouldShowBusiness = !selectedClassKey || isBusinessSelected;
                
                // If no flight should be shown, don't render this card
                if (!shouldShowFlight) {
                  return null;
                }
                
                return (
                  <Card key={`korean-${index}`} className={`rounded-xl border bg-card shadow transition-all ${
                    (isEconomySelected || isBusinessSelected) ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}>
                    <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                        <span className="font-semibold text-lg text-primary">
                          {flight.OriginAirport} → {flight.DestinationAirport}
                        </span>
                        <span className="text-muted-foreground text-sm md:ml-4">
                          {formatDate(flight.DepartsAt)}
                        </span>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-6 mt-2 md:mt-0 ml-auto">
                        <div className="flex items-center gap-6">
                          <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap">
                            {formatDuration(calculateDuration(flight.DepartsAt, flight.ArrivesAt))}
                          </span>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-sm font-medium">
                              {formatTime(flight.DepartsAt)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-sm font-medium">
                              {formatTime(flight.ArrivesAt)}
                              {getDateDifference(flight.DepartsAt, flight.ArrivesAt) > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">(+{getDateDifference(flight.DepartsAt, flight.ArrivesAt)})</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleExpandToggle(`korean-${index}`)}
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
                            src="/SV.png"
                            alt="Saudi Airlines"
                            width={24}
                            height={24}
                            className="inline-block align-middle rounded-md"
                            style={{ objectFit: 'contain' }}
                          />
                          <span className="font-mono">{flight.FlightNumbers}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 items-center">
                        <span className="text-sm font-medium flex flex-col gap-1">
                          {flight.economy && shouldShowEconomy && (
                            <span className="flex items-center gap-2">
                              <button
                                onClick={() => handleKoreanAirClassSelect(index, 'economy')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  isEconomySelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                                aria-label={isEconomySelected ? "Deselect Economy" : "Select Economy"}
                              >
                                {isEconomySelected ? 'Selected' : 'Select'}
                              </button>
                              Seats:
                              <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#E8E1F2', color: '#222' }}>
                                {flight.economySeats}
                              </span>
                              Economy:
                              <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#E8E1F2', color: '#222' }}>
                                {flight.economyMiles.toLocaleString()}
                              </span>
                              +
                              <span className="font-mono text-sm">
                                ${convertTaxToUSD(flight.TotalTaxes, flight.OriginAirport, flight.DestinationAirport).toFixed(2)}
                              </span>
                            </span>
                          )}
                          {flight.business && shouldShowBusiness && (
                            <span className="flex items-center gap-2">
                              <button
                                onClick={() => handleKoreanAirClassSelect(index, 'business')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  isBusinessSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                                aria-label={isBusinessSelected ? "Deselect Business" : "Select Business"}
                              >
                                {isBusinessSelected ? 'Selected' : 'Select'}
                              </button>
                              Seats:
                              <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#F3CD87', color: '#222' }}>
                                {flight.businessSeats}
                              </span>
                              Business:
                              <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#F3CD87', color: '#222' }}>
                                {flight.businessMiles.toLocaleString()}
                              </span>
                              +
                              <span className="font-mono text-sm">
                                ${convertTaxToUSD(flight.TotalTaxes, flight.OriginAirport, flight.DestinationAirport).toFixed(2)}
                              </span>
                            </span>
                          )}
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
                                      {iataToCity[flight.OriginAirport] || flight.OriginAirport} ({flight.OriginAirport}) → {iataToCity[flight.DestinationAirport] || flight.DestinationAirport} ({flight.DestinationAirport})
                                    </span>
                                  </div>
                                  <div className="flex flex-row justify-between items-center w-full md:w-auto mt-1 md:mt-0 md:ml-auto md:gap-6">
                                    <span className="text-sm font-mono text-muted-foreground font-bold">
                                      {formatDuration(calculateDuration(flight.DepartsAt, flight.ArrivesAt))}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {formatTime(flight.DepartsAt)}
                                      </span>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="text-sm font-medium">
                                        {formatTime(flight.ArrivesAt)}
                                        {getDateDifference(flight.DepartsAt, flight.ArrivesAt) > 0 && (
                                          <span className="text-xs text-muted-foreground ml-1">(+{getDateDifference(flight.DepartsAt, flight.ArrivesAt)})</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-row items-center gap-2 mt-1">
                                <Image
                                  src="/SV.png"
                                  alt="Saudi Airlines"
                                  width={20}
                                  height={20}
                                  className="inline-block align-middle rounded-md"
                                  style={{ objectFit: 'contain' }}
                                />
                                <span className="font-mono text-sm">{flight.FlightNumbers}</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({flight.Aircraft.join(', ')})
                                </span>
                              </div>

                            </div>
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
          {(!selectedFlight || !selectedKoreanAirClass) && (
            <div className="flex justify-center items-center mt-8">
              <Pagination
                currentPage={koreanAirCurrentPage - 1}
                totalPages={koreanAirTotalPages}
                onPageChange={handleKoreanAirPageChange}
              />
            </div>
          )}

          {/* Combined Booking Section - Only show when both Delta and Korean Air are selected */}
          {selectedFlight && selectedKoreanAirClass && (
            <div className="mt-8">
              <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Combined Booking</h2>
        <p className="text-gray-600 dark:text-gray-300">Book your complete itinerary with Virgin Atlantic</p>
              </div>
              
              <Card className="rounded-xl border bg-card shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    {/* Selected Flights Summary */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Selected Flights</h3>
                      
                      {/* Virgin Atlantic Flight */}
                      {(() => {
                        // Parse the unique identifier to find the exact flight
                        // The format is: "VS26-2025-08-08T08:10:00-JFK-LHR"
                        // We need to handle the date which contains hyphens
                        const parts = selectedFlight.split('-');
                        const flightNumber = parts[0];
                        const destinationAirport = parts[parts.length - 1];
                        const originAirport = parts[parts.length - 2];
                        // Reconstruct the date by joining the middle parts
                        const departsAt = parts.slice(1, -2).join('-');
                        
                        const selectedVirginFlight = flights.find(flight => 
                          flight.FlightNumbers === flightNumber &&
                          flight.DepartsAt === departsAt &&
                          flight.OriginAirport === originAirport &&
                          flight.DestinationAirport === destinationAirport
                        );
                        
                        if (!selectedVirginFlight) return null;
                        
                        return (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <Image
                              src={getAirlineLogo(selectedVirginFlight.FlightNumbers)}
                              alt="Virgin Atlantic"
                              width={20}
                              height={20}
                              className="rounded-md"
                              style={{ objectFit: 'contain' }}
                            />
                            <div className="flex-1">
                              <div className="font-medium dark:text-gray-100">
                                {selectedVirginFlight.OriginAirport} → {selectedVirginFlight.DestinationAirport}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(selectedVirginFlight.DepartsAt)} • {selectedVirginFlight.FlightNumbers}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium dark:text-gray-100">
                                {(selectedVirginFlight.MileageCost / 2).toLocaleString()} miles
                                <span className="text-xs text-gray-500 dark:text-gray-400 align-super">*</span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">+ ${(selectedVirginFlight.TotalTaxes / 100).toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Saudi Airlines Flight */}
                      {(() => {
                        const [flightIndex, className] = selectedKoreanAirClass.split('-');
                        const selectedSaudiFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
                        if (!selectedSaudiFlight) return null;
                        
                        const miles = className === 'economy' ? selectedSaudiFlight.economyMiles : selectedSaudiFlight.businessMiles;
                        const seats = className === 'economy' ? selectedSaudiFlight.economySeats : selectedSaudiFlight.businessSeats;
                        
                        return (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <Image
                              src="/SV.png"
                              alt="Saudi Airlines"
                              width={20}
                              height={20}
                              className="rounded-md"
                              style={{ objectFit: 'contain' }}
                            />
                            <div className="flex-1">
                              <div className="font-medium dark:text-gray-100">
                                {selectedSaudiFlight.OriginAirport} → {selectedSaudiFlight.DestinationAirport}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(selectedSaudiFlight.DepartsAt)} • {selectedSaudiFlight.FlightNumbers}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium dark:text-gray-100">{miles.toLocaleString()} miles</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">+ ${convertTaxToUSD(selectedSaudiFlight.TotalTaxes, selectedSaudiFlight.OriginAirport, selectedSaudiFlight.DestinationAirport).toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Note about mileage */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                      * Virgin Atlantic mileage amounts are estimates and may vary slightly from actual booking rates
                    </div>
                    
                    {/* Total Calculation */}
                    <div className="border-t dark:border-gray-700 pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-lg dark:text-white">Total</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {(() => {
                              // Parse the unique identifier to find the exact Virgin Atlantic flight
                              // The format is: "VS26-2025-08-08T08:10:00-JFK-LHR"
                              // We need to handle the date which contains hyphens
                              const parts = selectedFlight.split('-');
                              const flightNumber = parts[0];
                              const destinationAirport = parts[parts.length - 1];
                              const originAirport = parts[parts.length - 2];
                              // Reconstruct the date by joining the middle parts
                              const departsAt = parts.slice(1, -2).join('-');
                              
                              const selectedVirginFlight = flights.find(flight => 
                                flight.FlightNumbers === flightNumber &&
                                flight.DepartsAt === departsAt &&
                                flight.OriginAirport === originAirport &&
                                flight.DestinationAirport === destinationAirport
                              );
                              
                              const [flightIndex, className] = selectedKoreanAirClass.split('-');
                              const selectedSaudiFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
                              
                              if (!selectedVirginFlight || !selectedSaudiFlight) return '';
                              
                              // Use half points for Virgin Atlantic (second row pricing)
                              const virginMiles = selectedVirginFlight.MileageCost / 2;
                              const saudiMiles = className === 'economy' ? selectedSaudiFlight.economyMiles : selectedSaudiFlight.businessMiles;
                              const totalMiles = virginMiles + saudiMiles;
                              
                              // Calculate combined taxes
                              const virginTaxes = selectedVirginFlight.TotalTaxes / 100;
                              const saudiTaxes = convertTaxToUSD(selectedSaudiFlight.TotalTaxes, selectedSaudiFlight.OriginAirport, selectedSaudiFlight.DestinationAirport);
                              const totalTaxes = virginTaxes + saudiTaxes;
                              
                              return `${totalMiles.toLocaleString()} miles + $${totalTaxes.toFixed(2)}`;
                            })()}
                          </div>
                        </div>
                        
                        {/* Booking Link */}
                        <Button
                          onClick={() => {
                            // Parse the unique identifier to find the exact Virgin Atlantic flight
                            // The format is: "VS26-2025-08-08T08:10:00-JFK-LHR"
                            // We need to handle the date which contains hyphens
                            const parts = selectedFlight.split('-');
                            const flightNumber = parts[0];
                            const destinationAirport = parts[parts.length - 1];
                            const originAirport = parts[parts.length - 2];
                            // Reconstruct the date by joining the middle parts
                            const departsAt = parts.slice(1, -2).join('-');
                            
                            const selectedVirginFlight = flights.find(flight => 
                              flight.FlightNumbers === flightNumber &&
                              flight.DepartsAt === departsAt &&
                              flight.OriginAirport === originAirport &&
                              flight.DestinationAirport === destinationAirport
                            );
                            
                            const [flightIndex, className] = selectedKoreanAirClass.split('-');
                            const selectedSaudiFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
                            
                            if (!selectedVirginFlight || !selectedSaudiFlight) return;
                            
                            const virginDate = format(parseISO(selectedVirginFlight.DepartsAt), 'yyyy-MM-dd');
                            const saudiDate = format(parseISO(selectedSaudiFlight.DepartsAt), 'yyyy-MM-dd');
                            
                            const url = `https://www.virginatlantic.com/flights/search/slice?awardSearch=true&origin=${selectedVirginFlight.OriginAirport}&origin=${selectedSaudiFlight.OriginAirport}&CTA=AbTest_SP_Flights&destination=${selectedVirginFlight.DestinationAirport}&destination=${selectedSaudiFlight.DestinationAirport}&departing=${virginDate}&departing=${saudiDate}&passengers=a1t0c0i0`;
                            
                            window.open(url, '_blank');
                          }}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          Book on Virgin Atlantic
                        </Button>
                      </div>
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