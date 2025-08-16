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
import { format, parseISO, addYears, addDays } from 'date-fns';
import { Pagination } from '@/components/ui/pagination';
import ExpandFade from '@/components/ui/expand-fade';
import airportsData from '@/data/airports.json';
import type { DateRange } from 'react-day-picker';

interface APDFlight {
  TotalTaxes: number;
  Duration: number;
  OriginAirport: string;
  DestinationAirport: string;
  Aircraft: string[];
  FlightNumbers: string;
  DepartsAt: string;
  ArrivesAt: string;
  UpdatedAt: string;
  Distance: number;
  economy: boolean;
  business: boolean;
  economySeats: number;
  economyMiles: number;
  businessSeats?: number;
  businessMiles?: number;
}

interface KoreanAirFlight {
  OriginAirport: string;
  DestinationAirport: string;
  Aircraft: string[];
  FlightNumbers: string;
  DepartsAt: string;
  ArrivesAt: string;
  UpdatedAt: string;
  Distance: number;
  premiumSeats?: number;
  premiumMiles?: number;
  premiumTax?: number;
  businessSeats?: number;
  businessMiles?: number;
  businessTax?: number;
  firstSeats?: number;
  firstMiles?: number;
  firstTax?: number;
}

interface BundleClass {
  FClass?: string;
  JClass?: string;
  WClass?: string;
  YClass?: string;
}

interface FlightSegment {
  from: string;
  to: string;
  aircraft: string;
  stops: number;
  depart: string;
  arrive: string;
  flightnumber: string;
  duration: number;
  layover: number;
  distance: number;
  bundleClasses: BundleClass[];
}

interface Bundle {
  class: string;
  points: string;
  fareTax: string;
}

interface Itinerary {
  from: string;
  to: string;
  connections: string[];
  depart: string;
  arrive: string;
  duration: number;
  bundles: Bundle[];
  segments: FlightSegment[];
}

interface LiveSearchResponse {
  itinerary?: Itinerary[];
}

export default function APDDumpingPage() {
  const [flights, setFlights] = useState<APDFlight[]>([]);
  const [koreanAirFlights, setKoreanAirFlights] = useState<KoreanAirFlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [koreanAirLoading, setKoreanAirLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('departs_at');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [seatsFilter, setSeatsFilter] = useState<string>('1');
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [selectedKoreanAirClass, setSelectedKoreanAirClass] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [koreanAirCurrentPage, setKoreanAirCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [verifyingAvailability, setVerifyingAvailability] = useState(false);
  const [verifiedPricing, setVerifiedPricing] = useState<{
    miles: number;
    tax: number;
    isValid: boolean;
    errorMessage?: string;
  } | null>(null);
  const PAGE_SIZE = 10;
  const KOREAN_AIR_PAGE_SIZE = 10;

  // Removed automatic fetch - now user must click search button

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear all selected states when starting a new search
      setSelectedFlight(null);
      setSelectedKoreanAirClass(null);
      setKoreanAirFlights([]);
      setCurrentPage(1);
      setKoreanAirCurrentPage(1);
      setVerifiedPricing(null);
      
      // Prepare request body data
      
      const apiUrl = `https://api.bbairtools.com/api/seats-aero-alaska`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: date?.from ? format(date.from, 'yyyy-MM-dd') : undefined,
          endDate: date?.to ? format(date.to, 'yyyy-MM-dd') : undefined,
          seats: parseInt(seatsFilter)
        })
      });
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

  const verifyAvailabilityAndPricing = async () => {
    if (!selectedFlight || !selectedKoreanAirClass) return;
    
    try {
      setVerifyingAvailability(true);
      
      // Parse the unique identifier to find the exact APD flight
      const parts = selectedFlight.split('-');
      const flightNumber = parts[0];
      const destinationAirport = parts[parts.length - 1];
      const originAirport = parts[parts.length - 2];
      const departsAt = parts.slice(1, -2).join('-');
      
      const selectedAPDFlight = flights.find(flight => 
        flight.FlightNumbers === flightNumber &&
        flight.DepartsAt === departsAt &&
        flight.OriginAirport === originAirport &&
        flight.DestinationAirport === destinationAirport
      );
      
      const [flightIndex, className] = selectedKoreanAirClass.split('-');
      const selectedBAFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
      
      if (!selectedAPDFlight || !selectedBAFlight) {
        return;
      }
      
      // Call the live-search-as API to verify availability
      const apiUrl = 'https://api.bbairtools.com/api/live-search-as';
      const requestBody = {
        from: selectedAPDFlight.OriginAirport,
        to: selectedBAFlight.DestinationAirport,
        depart: format(parseISO(selectedAPDFlight.DepartsAt), 'yyyy-MM-dd'),
        ADT: parseInt(seatsFilter)
      };
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': '*/*',
          'accept-language': 'en-US,en;q=0.9',
          'origin': 'https://www.bbairtools.com',
          'referer': 'https://www.bbairtools.com/',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Find the specific itinerary with the exact flight numbers
      let foundItinerary: Itinerary | null = null;
      
      // The API response structure has an array of itineraries
      if (data.itinerary && Array.isArray(data.itinerary)) {
        console.log('=== DEBUG: Flight Number Matching ===');
        console.log('Searching for first flight:', `"${selectedAPDFlight.FlightNumbers}"`);
        console.log('Searching for second flight:', `"${selectedBAFlight.FlightNumbers}"`);
        console.log('Total itineraries found:', data.itinerary.length);
        
        // Search through all itineraries to find one with both flight numbers
        for (const itinerary of data.itinerary) {
          if (itinerary.segments && Array.isArray(itinerary.segments)) {
            console.log('Checking itinerary:', itinerary.from, '→', itinerary.to);
            console.log('Available segments:', itinerary.segments.map((seg: FlightSegment) => `"${seg.flightnumber}"`));
            
            const hasFirstFlight = itinerary.segments.some((seg: FlightSegment) => seg.flightnumber === selectedAPDFlight.FlightNumbers);
            const hasSecondFlight = itinerary.segments.some((seg: FlightSegment) => seg.flightnumber === selectedBAFlight.FlightNumbers);
            
            console.log('First flight found:', hasFirstFlight);
            console.log('Second flight found:', hasSecondFlight);
            
            if (hasFirstFlight && hasSecondFlight) {
              foundItinerary = itinerary;
              console.log('✅ Found matching itinerary!');
              break;
            }
          }
        }
        
        console.log('=====================================');
      }
      
      if (!foundItinerary) {
        // Check which specific flights are missing for better error reporting
        let foundFirstFlight = false;
        let foundSecondFlight = false;
        
        if (data.itinerary && Array.isArray(data.itinerary)) {
          // Check if we can find either flight in any itinerary
          for (const itinerary of data.itinerary) {
            if (itinerary.segments && Array.isArray(itinerary.segments)) {
              const segments = itinerary.segments;
              const hasFirstFlight = segments.some((seg: FlightSegment) => seg.flightnumber === selectedAPDFlight.FlightNumbers);
              const hasSecondFlight = segments.some((seg: FlightSegment) => seg.flightnumber === selectedBAFlight.FlightNumbers);
              
              if (hasFirstFlight) foundFirstFlight = true;
              if (hasSecondFlight) foundSecondFlight = true;
            }
          }
        }
        
        // Build error message based on what's actually missing
        let errorMessage = '❌ No matching itinerary found with the selected flight numbers';
        if (!foundFirstFlight || !foundSecondFlight) {
          const missingParts = [];
          if (!foundFirstFlight) missingParts.push(`First flight ${selectedAPDFlight.FlightNumbers}`);
          if (!foundSecondFlight) missingParts.push(`Second flight ${selectedBAFlight.FlightNumbers}`);
          errorMessage = `❌ Missing: ${missingParts.join(', ')}`;
        }
          
        setVerifiedPricing({
          miles: 0,
          tax: 0,
          isValid: false,
          errorMessage: errorMessage
        });
        return;
      }
      
      // Check if the selected cabin class is available in bundles
      const selectedClass = className === 'premium' ? 'W' : className === 'business' ? 'J' : className === 'first' ? 'F' : 'Y';
      const matchingBundle = foundItinerary.bundles.find((bundle: Bundle) => bundle.class === selectedClass);
      
      if (!matchingBundle) {
        return;
      }
      
      // Verify bundle classes match the selected flights
      let isValid = true;
      let errorMessage = '';
      
      // Check first flight (APD flight) - should have Y class for economy, J for business, W for premium
      const firstFlightSegment = foundItinerary.segments.find((seg: FlightSegment) => seg.flightnumber === selectedAPDFlight.FlightNumbers);
      if (firstFlightSegment) {
        const expectedFirstClass = className === 'premium' ? 'W' : className === 'business' ? 'J' : className === 'first' ? 'F' : 'Y';
        const hasValidFirstClass = firstFlightSegment.bundleClasses.some((bc: BundleClass) => 
          bc[`${expectedFirstClass}Class`] === 'Y'
        );
        
        if (!hasValidFirstClass) {
          isValid = false;
          errorMessage = `❌ Mixed cabin is not available`;
        }
      }
      
      // Check second flight (BA flight) - should have the selected class
      const secondFlightSegment = foundItinerary.segments.find((seg: FlightSegment) => seg.flightnumber === selectedBAFlight.FlightNumbers);
      if (secondFlightSegment) {
        const hasValidSecondClass = secondFlightSegment.bundleClasses.some((bc: BundleClass) => 
          bc[`${selectedClass}Class`] === selectedClass
        );
        
        if (!hasValidSecondClass) {
          isValid = false;
          errorMessage = `❌ Second flight ${selectedBAFlight.FlightNumbers} doesn't have valid ${selectedClass} class`;
        }
      }
      
      if (isValid) {
        // Update the total calculation with actual values from API
        const actualMiles = parseInt(matchingBundle.points);
        const actualTax = parseFloat(matchingBundle.fareTax);
        
        // Store the verified data for use in total calculation
        setVerifiedPricing({
          miles: actualMiles,
          tax: actualTax,
          isValid: true
        });
      } else {
        setVerifiedPricing({
          miles: 0,
          tax: 0,
          isValid: false,
          errorMessage: `❌ ${errorMessage}`
        });
      }
    } catch (err: any) {
      setVerifiedPricing({
        miles: 0,
        tax: 0,
        isValid: false,
        errorMessage: `❌ Error: ${err.message || 'Failed to verify availability'}`
      });
    } finally {
      setVerifyingAvailability(false);
    }
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
    return '/BA.png';
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

    // Seats filtering - check if either economy or business has enough seats
    const matchesSeatsFilter = (flight.economy && flight.economySeats >= parseInt(seatsFilter)) || 
                               (flight.business && flight.businessSeats && flight.businessSeats >= parseInt(seatsFilter));

    // Selected flight filtering - create unique identifier for each flight
    const flightUniqueId = `${flight.FlightNumbers}-${flight.DepartsAt}-${flight.OriginAirport}-${flight.DestinationAirport}`;
    const matchesSelectedFlight = selectedFlight ? flightUniqueId === selectedFlight : true;
    
    return matchesSearch && matchesDateRange && matchesSeatsFilter && matchesSelectedFlight;
  });

  const sortedFlights = [...filteredFlights].sort((a, b) => {
    switch (sortBy) {
      case 'departs_at':
        return new Date(a.DepartsAt).getTime() - new Date(b.DepartsAt).getTime();
      case 'mileage_cost':
        const minMilesA = Math.min(a.economyMiles, a.businessMiles || Infinity);
        const minMilesB = Math.min(b.economyMiles, b.businessMiles || Infinity);
        return minMilesA - minMilesB;
      case 'remaining_seats':
        const maxSeatsA = Math.max(a.economySeats, a.businessSeats || 0);
        const maxSeatsB = Math.max(b.economySeats, b.businessSeats || 0);
        return maxSeatsB - maxSeatsA;
      case 'total_duration':
        return a.Duration - b.Duration;
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
    
          // Reset verification when flight selection changes
      setVerifiedPricing(null);
    
    // If selecting a flight, call the BA-JF API
    if (selectedFlight !== flightId) {
      // The flightId is the unique identifier, so we need to find the flight by reconstructing it
      const selectedFlightData = flights.find(flight => {
        const flightUniqueId = `${flight.FlightNumbers}-${flight.DepartsAt}-${flight.OriginAirport}-${flight.DestinationAirport}`;
        return flightUniqueId === flightId;
      });
      
      if (selectedFlightData) {
        callBAJFAPI(selectedFlightData.ArrivesAt);
      }
    } else {
      // If deselecting (selectedFlight === flightId), clear Korean Air flights and selection
      setKoreanAirFlights([]);
      setSelectedKoreanAirClass(null);
    }
  };

  const callBAJFAPI = async (arrivalTime: string) => {
    try {
      setKoreanAirLoading(true);
      
      const apiUrl = `https://api.bbairtools.com/api/BA-JF`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: arrivalTime,
          seats: parseInt(seatsFilter)
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store all BA-JF flights from the response
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
  const sortedKoreanAirFlights = [...koreanAirFlights].sort((a, b) => {
    // Sort by lowest available miles (premium, business, or first)
    const aMinMiles = Math.min(
      a.premiumMiles || Infinity,
      a.businessMiles || Infinity,
      a.firstMiles || Infinity
    );
    const bMinMiles = Math.min(
      b.premiumMiles || Infinity,
      b.businessMiles || Infinity,
      b.firstMiles || Infinity
    );
    return aMinMiles - bMinMiles;
  });
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
    
    // If selecting a different class or deselecting, reset verification
    if (selectedKoreanAirClass !== classKey) {
      setVerifiedPricing(null);
    }
    
    setSelectedKoreanAirClass(selectedKoreanAirClass === classKey ? null : classKey);
  };

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto px-2 py-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching British Airways flights...</p>
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
          {/* Seats */}
          <div className="flex flex-col justify-center">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">
              Seats
            </label>
            <Select value={seatsFilter} onValueChange={setSeatsFilter}>
              <SelectTrigger className="w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                <SelectValue placeholder="Select seats" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                ))}
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
                  toDate={addDays(new Date(), 361)}
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
      {flights.length > 0 && (
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
      )}

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

            </div>
          );
        }
        
        return null;
      })()}

      {/* Flight Cards */}
      <div className="flex flex-col gap-4">
        {flights.length === 0 ? (
          // Don't show anything when no search has been performed
          null
        ) : paginatedFlights.length === 0 ? (
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
              <Card key={flightUniqueId} className={`rounded-xl border bg-card shadow transition-all overflow-hidden ${
                selectedFlight === flightUniqueId ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}>
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 w-full min-w-0">
                    <span className="font-semibold text-lg text-primary break-words">
                      {flight.OriginAirport} → {flight.DestinationAirport}
                    </span>
                    <span className="text-muted-foreground text-sm md:ml-4 flex-shrink-0">
                      {formatDate(flight.DepartsAt)}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-6 mt-2 md:mt-0 ml-auto min-w-0">
                    <div className="flex items-center gap-6 min-w-0">
                      <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap flex-shrink-0">
                        {formatDuration(flight.Duration)}
                      </span>
                      <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
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
                    className="ml-2 p-1 hover:bg-muted rounded transition-colors self-start md:self-center flex-shrink-0"
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
                  <div className="flex flex-wrap gap-2 items-center min-w-0">
                    <span className="flex items-center gap-1 min-w-0">
                      <Image
                        src={getAirlineLogo(flight.FlightNumbers)}
                        alt={flight.FlightNumbers.startsWith('DL') ? 'Delta' : 'British Airways'}
                        width={24}
                        height={24}
                        className="inline-block align-middle rounded-md flex-shrink-0"
                        style={{ objectFit: 'contain' }}
                      />
                      <span className="font-mono break-words">{flight.FlightNumbers}</span>
                      <button
                        onClick={() => handleFlightSelect(flightUniqueId)}
                        className={`ml-2 px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
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
                                  {formatDuration(flight.Duration)}
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
                              alt={flight.FlightNumbers.startsWith('DL') ? 'Delta' : 'British Airways'}
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
                const premiumClassKey = `${index}-premium`;
                const businessClassKey = `${index}-business`;
                const firstClassKey = `${index}-first`;
                const isPremiumSelected = selectedKoreanAirClass === premiumClassKey;
                const isBusinessSelected = selectedKoreanAirClass === businessClassKey;
                const isFirstSelected = selectedKoreanAirClass === firstClassKey;
                
                // Filter logic: if a class is selected, only show that specific flight and class
                const selectedClassKey = selectedKoreanAirClass;
                const shouldShowFlight = !selectedClassKey || isPremiumSelected || isBusinessSelected || isFirstSelected;
                const shouldShowPremium = !selectedClassKey || isPremiumSelected;
                const shouldShowBusiness = !selectedClassKey || isBusinessSelected;
                const shouldShowFirst = !selectedClassKey || isFirstSelected;
                
                // If no flight should be shown, don't render this card
                if (!shouldShowFlight) {
                  return null;
                }
                
                return (
                  <Card key={`korean-${index}`} className={`rounded-xl border bg-card shadow transition-all overflow-hidden ${
                    (isPremiumSelected || isBusinessSelected || isFirstSelected) ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}>
                    <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 w-full min-w-0">
                        <span className="font-semibold text-lg text-primary break-words">
                          {flight.OriginAirport} → {flight.DestinationAirport}
                        </span>
                        <span className="text-muted-foreground text-sm md:ml-4 flex-shrink-0">
                          {formatDate(flight.DepartsAt)}
                        </span>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-6 mt-2 md:mt-0 ml-auto min-w-0">
                        <div className="flex items-center gap-6 min-w-0">
                          <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap flex-shrink-0">
                            {formatDuration(calculateDuration(flight.DepartsAt, flight.ArrivesAt))}
                          </span>
                          <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
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
                        className="ml-2 p-1 hover:bg-muted rounded transition-colors self-start md:self-center flex-shrink-0"
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
                      <div className="flex flex-wrap gap-2 items-center min-w-0">
                        <span className="flex items-center gap-1 min-w-0">
                          <Image
                            src="/BA.png"
                            alt="British Airways"
                            width={24}
                            height={24}
                            className="inline-block align-middle rounded-md flex-shrink-0"
                            style={{ objectFit: 'contain' }}
                          />
                          <span className="font-mono break-words">{flight.FlightNumbers}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 items-center min-w-0 w-full md:w-auto">
                        <span className="text-sm font-medium flex flex-col gap-1 min-w-0 w-full">
                          {flight.premiumSeats && shouldShowPremium && (
                            <span className="flex flex-wrap items-center gap-2 min-w-0 w-full">
                              <button
                                onClick={() => handleKoreanAirClassSelect(index, 'premium')}
                                className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                                  isPremiumSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                                aria-label={isPremiumSelected ? "Deselect Premium" : "Select Premium"}
                              >
                                {isPremiumSelected ? 'Selected' : 'Select'}
                              </button>
                              <span className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
                                <span className="text-xs text-muted-foreground">Seats:</span>
                                <span className="rounded px-2 py-0.5 font-mono font-bold text-sm flex-shrink-0" style={{ background: '#B8A4CC', color: '#222' }}>
                                  {flight.premiumSeats}
                                </span>
                                <span className="text-xs text-muted-foreground">Premium:</span>
                                <span className="rounded px-2 py-0.5 font-mono font-bold text-sm flex-shrink-0" style={{ background: '#B8A4CC', color: '#222' }}>
                                  {flight.premiumMiles?.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">+</span>
                                <span className="font-mono text-sm break-words">
                                  ${(flight.premiumTax ? flight.premiumTax / 100 : 0).toFixed(2)}
                                </span>
                              </span>
                            </span>
                          )}
                          {flight.businessSeats && shouldShowBusiness && (
                            <span className="flex flex-wrap items-center gap-2 min-w-0 w-full">
                              <button
                                onClick={() => handleKoreanAirClassSelect(index, 'business')}
                                className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                                  isBusinessSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                                aria-label={isBusinessSelected ? "Deselect Business" : "Select Business"}
                              >
                                {isBusinessSelected ? 'Selected' : 'Select'}
                              </button>
                              <span className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
                                <span className="text-xs text-muted-foreground">Seats:</span>
                                <span className="rounded px-2 py-0.5 font-mono font-bold text-sm flex-shrink-0" style={{ background: '#F3CD87', color: '#222' }}>
                                  {flight.businessSeats}
                                </span>
                                <span className="text-xs text-muted-foreground">Business:</span>
                                <span className="rounded px-2 py-0.5 font-mono font-bold text-sm flex-shrink-0" style={{ background: '#F3CD87', color: '#222' }}>
                                  {flight.businessMiles?.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">+</span>
                                <span className="font-mono text-sm break-words">
                                  ${(flight.businessTax ? flight.businessTax / 100 : 0).toFixed(2)}
                                </span>
                              </span>
                            </span>
                          )}
                          {flight.firstSeats && shouldShowFirst && (
                            <span className="flex flex-wrap items-center gap-2 min-w-0 w-full">
                              <button
                                onClick={() => handleKoreanAirClassSelect(index, 'first')}
                                className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                                  selectedKoreanAirClass === `${index}-first`
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                                aria-label={selectedKoreanAirClass === `${index}-first` ? "Deselect First" : "Select First"}
                              >
                                {selectedKoreanAirClass === `${index}-first` ? 'Selected' : 'Select'}
                              </button>
                              <span className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
                                <span className="text-xs text-muted-foreground">Seats:</span>
                                <span className="rounded px-2 py-0.5 font-mono font-bold text-sm flex-shrink-0" style={{ background: '#D88A3F', color: '#222' }}>
                                  {flight.firstSeats}
                                </span>
                                <span className="text-xs text-muted-foreground">First:</span>
                                <span className="rounded px-2 py-0.5 font-mono font-bold text-sm flex-shrink-0" style={{ background: '#D88A3F', color: '#222' }}>
                                  {flight.firstMiles?.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">+</span>
                                <span className="font-mono text-sm break-words">
                                  ${(flight.firstTax ? flight.firstTax / 100 : 0).toFixed(2)}
                                </span>
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
                                  src="/BA.png"
                                  alt="British Airways"
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
        <p className="text-gray-600 dark:text-gray-300">Book your complete itinerary with British Airways</p>
              </div>
              
              <Card className="rounded-xl border bg-card shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    {/* Selected Flights Summary */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Selected Flights</h3>
                      
                      {/* British Airways Flight */}
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
                              alt="British Airways"
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

                          </div>
                        );
                      })()}
                      
                      {/* Saudi Airlines Flight */}
                      {(() => {
                        const [flightIndex, className] = selectedKoreanAirClass.split('-');
                        const selectedSaudiFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
                        if (!selectedSaudiFlight) return null;
                        

                        
                        return (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <Image
                              src="/BA.png"
                              alt="British Airways"
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

                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Note about mileage */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                      * Alaska Airlines mileage amounts are estimates and may vary slightly from actual booking rates
                    </div>
                    
                    {/* Total Calculation */}
                    <div className="border-t dark:border-gray-700 pt-4">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2 md:mb-0">
                            <div className="font-semibold text-lg dark:text-white">Total</div>
                            <Button
                              onClick={verifyAvailabilityAndPricing}
                              disabled={verifyingAvailability}
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                            >
                              {verifyingAvailability ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Verify Pricing / Availability'
                              )}
                            </Button>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {(() => {
                              // Parse the unique identifier to find the exact APD flight
                              const parts = selectedFlight.split('-');
                              const flightNumber = parts[0];
                              const destinationAirport = parts[parts.length - 1];
                              const originAirport = parts[parts.length - 2];
                              const departsAt = parts.slice(1, -2).join('-');
                              
                              const selectedAPDFlight = flights.find(flight => 
                                flight.FlightNumbers === flightNumber &&
                                flight.DepartsAt === departsAt &&
                                flight.OriginAirport === originAirport &&
                                flight.DestinationAirport === destinationAirport
                              );
                              
                              const [flightIndex, className] = selectedKoreanAirClass.split('-');
                              const selectedBAFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
                              
                              if (!selectedAPDFlight || !selectedBAFlight) return 'Calculating...';
                              
                              // Calculate total distance using the Distance field from both flights
                              const totalDistance = selectedAPDFlight.Distance + selectedBAFlight.Distance;
                              
                              // British Airways award chart based on distance and cabin class
                              let miles;
                              if (totalDistance < 1500) {
                                if (className === 'premium') miles = 10000;
                                else if (className === 'business') miles = 15000;
                                else if (className === 'first') miles = 22500;
                                else miles = 7500; // economy
                              } else if (totalDistance < 3500) {
                                if (className === 'premium') miles = 30000;
                                else if (className === 'business') miles = 45000;
                                else if (className === 'first') miles = 67500;
                                else miles = 22500; // economy
                              } else if (totalDistance < 5000) {
                                if (className === 'premium') miles = 35000;
                                else if (className === 'business') miles = 55000;
                                else if (className === 'first') miles = 82500;
                                else miles = 27500; // economy
                              } else if (totalDistance < 7000) {
                                if (className === 'premium') miles = 45000;
                                else if (className === 'business') miles = 70000;
                                else if (className === 'first') miles = 105000;
                                else miles = 35000; // economy
                              } else if (totalDistance < 10000) {
                                if (className === 'premium') miles = 55000;
                                else if (className === 'business') miles = 85000;
                                else if (className === 'first') miles = 130000;
                                else miles = 42500; // economy
                              } else {
                                if (className === 'premium') miles = 72500;
                                else if (className === 'business') miles = 110000;
                                else if (className === 'first') miles = 165000;
                                else miles = 55000; // economy
                              }
                              
                              // Use verified pricing if available, otherwise use estimated pricing
                              if (verifiedPricing && verifiedPricing.isValid) {
                                return `${verifiedPricing.miles.toLocaleString()} miles + $${verifiedPricing.tax.toFixed(2)} (✅ Verified)`;
                              } else if (verifiedPricing && !verifiedPricing.isValid && verifiedPricing.errorMessage) {
                                // Show error message instead of pricing when verification fails
                                return verifiedPricing.errorMessage;
                              } else {
                                // Tax range $200-$400
                                return `${miles.toLocaleString()} miles + $200-$400`;
                              }
                            })()}
                          </div>
                        </div>
                        
                        {/* Booking Link */}
                        <Button
                          onClick={() => {
                            // Parse the unique identifier to find the exact APD flight
                            const parts = selectedFlight.split('-');
                            const flightNumber = parts[0];
                            const destinationAirport = parts[parts.length - 1];
                            const originAirport = parts[parts.length - 2];
                            const departsAt = parts.slice(1, -2).join('-');
                            
                            const selectedAPDFlight = flights.find(flight => 
                              flight.FlightNumbers === flightNumber &&
                              flight.DepartsAt === departsAt &&
                              flight.OriginAirport === originAirport &&
                              flight.DestinationAirport === destinationAirport
                            );
                            
                            const [flightIndex, className] = selectedKoreanAirClass.split('-');
                            const selectedBAFlight = paginatedKoreanAirFlights[parseInt(flightIndex)];
                            
                            if (!selectedAPDFlight || !selectedBAFlight) return;
                            
                            // Alaska Airlines award search URL
                            // Format: https://www.alaskaair.com/search/results?A=1&O=origin&D=destination&OD=date&OT=Anytime&RT=false&ShoppingMethod=onlineaward&UPG=none
                            const alaskaDate = format(parseISO(selectedAPDFlight.DepartsAt), 'yyyy-MM-dd');
                            const url = `https://www.alaskaair.com/search/results?A=1&O=${selectedAPDFlight.OriginAirport.toLowerCase()}&D=${selectedBAFlight.DestinationAirport.toLowerCase()}&OD=${alaskaDate}&OT=Anytime&RT=false&ShoppingMethod=onlineaward&UPG=none`;
                            
                            window.open(url, '_blank');
                          }}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full md:w-auto"
                        >
                          Book on Alaska Airlines
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