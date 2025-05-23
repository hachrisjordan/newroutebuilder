'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import SeatMapTooltip from './seat-map-tooltip';

// Add CLOUD_STORAGE_BASE_URL constant at the top of the file
const CLOUD_STORAGE_BASE_URL = 'https://storage.googleapis.com/routebuilder_storage';

interface FlightData {
  flightNumber: string;
  date: string;
  registration: string;
  origin: string;
  destination: string;
  ontime: string;
  airline: string;
}

interface FlightCalendarProps {
  flightData: FlightData[];
}

export function FlightCalendar({ flightData }: FlightCalendarProps) {
  // Get unique months from flight data
  const months = Array.from(
    new Set(
      flightData.map(flight => {
        const date = new Date(flight.date);
        return `${date.getFullYear()}-${date.getMonth() + 1}`;
      })
    )
  ).sort((a, b) => {
    const [aYear, aMonth] = a.split('-').map(Number);
    const [bYear, bMonth] = b.split('-').map(Number);
    return aYear !== bYear ? aYear - bYear : aMonth - bMonth;
  });

  const [currentMonthIndex, setCurrentMonthIndex] = useState(months.length > 0 ? months.length - 1 : 0);

  const currentMonthKey = months[currentMonthIndex];
  const [year, month] = currentMonthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handlePreviousMonth = () => {
    setCurrentMonthIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthIndex(prev => Math.min(months.length - 1, prev + 1));
  };

  // Filter flights for current month
  const currentMonthFlights = flightData.filter(flight => {
    const flightDate = new Date(flight.date);
    return `${flightDate.getFullYear()}-${flightDate.getMonth() + 1}` === currentMonthKey;
  });

  // Group and count (origin, destination) pairs
  const pairCounts: Record<string, number> = {};
  currentMonthFlights.forEach(flight => {
    const key = `${flight.origin}|${flight.destination}`;
    pairCounts[key] = (pairCounts[key] || 0) + 1;
  });
  // Find the most common pair
  const mostCommonPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const [mostCommonOrigin, mostCommonDestination] = mostCommonPair ? mostCommonPair.split('|') : [null, null];

  // Only keep flights for the most common pair
  const filteredFlights = currentMonthFlights.filter(flight =>
    flight.origin === mostCommonOrigin && flight.destination === mostCommonDestination
  );

  const formatOntime = (ontime: string) => {
    if (ontime === 'N/A') return 'N/A';
    const minutes = parseInt(ontime);
    return minutes >= 0 ? `+${minutes}` : `${minutes}`;
  };

  // Get first day of month and total days
  const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
  const lastDay = new Date(parseInt(year), parseInt(month), 0);
  const totalDays = lastDay.getDate();
  const startingDay = firstDay.getDay();

  // Add seat config cache
  const seatConfigCache: Record<string, any> = {};

  // Update getSeatConfig to dynamically load seat configs
  async function getSeatConfig(registration: string, airline: string) {
    if (!registration || registration === 'N/A' || !airline) return null;
    let seatData = seatConfigCache[airline];
    if (!seatData) {
      try {
        console.log(`DEBUG: Fetching seat config for airline ${airline} from ${CLOUD_STORAGE_BASE_URL}/seat_${airline}.json`);
        const response = await fetch(`${CLOUD_STORAGE_BASE_URL}/seat_${airline}.json`);
        if (!response.ok) {
          console.error(`DEBUG: Failed to fetch seat config for ${airline}, status: ${response.status}`);
          throw new Error('Config not found');
        }
        seatData = await response.json();
        console.log(`DEBUG: Successfully fetched seat config for ${airline}`);
        seatConfigCache[airline] = seatData;
      } catch (error) {
        console.error('DEBUG: Error fetching seat config:', error);
        return null;
      }
    }
    const tailMap = seatData.tail_number_distribution as Record<string, string>;
    const variant = tailMap[registration];
    if (!variant) return null;
    const configsByType = seatData.configurations_by_type as Record<string, any[]>;
    for (const [aircraftType, configs] of Object.entries(configsByType)) {
      const found = configs.find(cfg => cfg.variant === variant);
      if (found) {
        return { aircraftType, ...found };
      }
    }
    return null;
  }

  const getClosestFlight = (targetDateStr: string): FlightData | undefined => {
    const targetDate = new Date(targetDateStr);
    let closestFlight: FlightData | undefined = undefined;
    let minDiff = 3; // Only consider within 2 days

    filteredFlights.forEach(f => {
      const fDate = new Date(f.date);
      const diff = Math.abs((fDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 2 && diff < minDiff) {
        minDiff = diff;
        closestFlight = f;
      }
    });

    return closestFlight;
  };

  // Helper: Delay status color and text logic from seat-type-viewer.jsx
  function getOntimeStatus(ontime: string, date: string) {
    if (!ontime) return null;
    if (ontime === 'CANCELED') {
      return { color: '#000000', text: 'Canceled' };
    }
    if (ontime.startsWith('Diverted to')) {
      return { color: '#9c27b0', text: ontime };
    }
    const flightDate = new Date(date);
    const today = new Date();
    const isFuture = flightDate > today;
    const diffTime = Math.abs(today.getTime() - flightDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (ontime === 'N/A') {
      if (isFuture) return null;
      if (diffDays > 2) return { color: '#9e9e9e', text: 'No info' };
      return null;
    }
    const minutes = parseInt(ontime);
    if (isNaN(minutes)) return null;
    let color, text;
    if (minutes <= 0) color = '#4caf50';
    else if (minutes < 30) color = '#ffc107';
    else color = '#f44336';
    if (minutes === 0) text = 'Arrived on time';
    else if (minutes < 0) text = `Arrived ${Math.abs(minutes)}m early`;
    else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      const timeStr = remainingMinutes > 0 ? `${hours}h${remainingMinutes}m` : `${hours}h`;
      text = `Arrived ${timeStr} late`;
    } else text = `Arrived ${minutes}m late`;
    return { color, text };
  }

  // Update the variant collection logic to handle async getSeatConfig
  const loadSeatConfigs = async () => {
    const newVariantCounts = new Map<string, number>();
    const newVariantInfo = new Map<string, { color: string; aircraftType: string; note: string }>();
    for (const flight of filteredFlights) {
      const seatConfig = await getSeatConfig(flight.registration, flight.airline);
      if (seatConfig) {
        newVariantCounts.set(seatConfig.variant, (newVariantCounts.get(seatConfig.variant) || 0) + 1);
        if (!newVariantInfo.has(seatConfig.variant)) {
          newVariantInfo.set(seatConfig.variant, {
            color: seatConfig.color,
            aircraftType: seatConfig.aircraftType,
            note: seatConfig.note,
          });
        }
      }
    }
    setVariantCounts(newVariantCounts);
    setVariantInfo(newVariantInfo);
  };
  useEffect(() => {
    loadSeatConfigs();
  }, [filteredFlights]);

  // Update the calendar cell rendering to handle async getSeatConfig
  const [seatConfigs, setSeatConfigs] = useState<Record<string, any>>({});
  useEffect(() => {
    const loadSeatConfigsForFlights = async () => {
      const newSeatConfigs: Record<string, any> = {};
      for (const flight of filteredFlights) {
        const config = await getSeatConfig(flight.registration, flight.airline);
        if (config) {
          newSeatConfigs[flight.registration] = config;
        }
      }
      setSeatConfigs(newSeatConfigs);
    };
    loadSeatConfigsForFlights();
  }, [filteredFlights]);

  // Add missing state variables for variant counts and info
  const [variantCounts, setVariantCounts] = useState<Map<string, number>>(new Map());
  const [variantInfo, setVariantInfo] = useState<Map<string, { color: string; aircraftType: string; note: string }>>(new Map());

  // Re-add variantStats and allVariants calculation
  const variantStats = Array.from(variantCounts.entries()).sort((a, b) => b[1] - a[1]);
  const allVariants = variantStats.map(([variant]) => variant);
  const [selectedVariants, setSelectedVariants] = useState<string[]>(allVariants);

  // Re-add useEffect for selectedVariants
  useEffect(() => {
    setSelectedVariants(allVariants);
  }, [currentMonthKey, allVariants.join(",")]);

  return (
    <Card className="w-[80%]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousMonth}
            disabled={currentMonthIndex === 0}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-2xl font-semibold">{monthName}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            disabled={currentMonthIndex === months.length - 1}
            className="h-10 w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        {/* Variant multi-select dropdown, right-aligned */}
        {variantStats.length > 0 && (
          <div className="mb-4 flex justify-end">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-start px-3">
                  {selectedVariants.length === allVariants.length ? (
                    'All variants'
                  ) : selectedVariants.length === 1 ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: variantInfo.get(selectedVariants[0])?.color || '#ccc' }} />
                      <span className="font-bold">{variantInfo.get(selectedVariants[0])?.aircraftType} ({selectedVariants[0]})</span>
                    </span>
                  ) : (
                    <span>{selectedVariants.length} variants selected</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[220px]" onCloseAutoFocus={(e: Event) => e.preventDefault()}>
                {variantStats.map(([variant, count]) => (
                  <DropdownMenuCheckboxItem
                    key={variant}
                    checked={selectedVariants.includes(variant)}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) setSelectedVariants([...selectedVariants, variant]);
                      else setSelectedVariants(selectedVariants.filter(v => v !== variant));
                    }}
                    onPointerDown={(e: React.PointerEvent<Element>) => e.stopPropagation()}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: variantInfo.get(variant)?.color || '#ccc' }} />
                      <span className="font-bold">{variantInfo.get(variant)?.aircraftType} ({variant})</span>
                      <span className="italic text-xs ml-2">{variantInfo.get(variant)?.note}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{count}x</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <div className="grid grid-cols-7 gap-4 sm:gap-2 w-full items-start">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-base font-medium text-muted-foreground py-3">
              {day}
            </div>
          ))}
          {Array.from({ length: startingDay }).map((_, index) => (
            <div key={`empty-${index}`} className="border rounded-md p-2 min-h-[120px] bg-transparent" />
          ))}
          {Array.from({ length: totalDays }).map((_, index) => {
            const day = index + 1;
            // Use UTC and ISO string for robust date handling
            const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, day));
            const dateStr = dateObj.toISOString().split('T')[0];
            // Normalize data date for comparison
            const normalizedFlightDates = filteredFlights.map(f => {
              const fDate = new Date(f.date);
              return fDate.toISOString().split('T')[0];
            });
            const flight: FlightData | undefined = getClosestFlight(dateStr);
            const seatConfig = flight ? seatConfigs[flight.registration] : null;
            const isValid = flight && flight.registration && flight.registration !== 'N/A' && seatConfig && selectedVariants.includes(seatConfig.variant);

            return (
              <div
                key={day}
                className="border rounded-md p-2 text-sm hover:bg-accent transition-colors relative h-full min-h-[120px]"
              >
                {/* Top row: delay status (left) and day number (right, with border) */}
                <div className="absolute top-1 left-2 right-2 flex flex-row items-center justify-between w-auto">
                  {(() => {
                    const status = isValid ? getOntimeStatus(flight.ontime, dateStr) : null;
                    if (!status) return <span />;
                    return (
                      <span className="flex items-center gap-1" style={{ color: status.color }}>
                        <span style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: status.color,
                          marginRight: 4
                        }} />
                        <span className="font-medium text-xs">{status.text}</span>
                      </span>
                    );
                  })()}
                  <span className="font-medium text-base border-r-2 border-gray-300 pr-2 font-bold">{day}</span>
                </div>
                {/* Main content */}
                {isValid ? (
                  <div className="flex flex-col items-center mt-8 gap-1">
                    <div className="font-bold text-[15px] text-center leading-tight">
                      {seatConfig.aircraftType} <span className="font-mono">({seatConfig.variant})</span>
                    </div>
                    <div className="text-[12px] font-mono text-center">{seatConfig.config}</div>
                    <SeatMapTooltip airline="JL" variant={seatConfig.variant} aircraftType={seatConfig.aircraftType}>
                      <div className="text-[12px] text-muted-foreground text-center italic underline underline-offset-2">
                        {seatConfig.note}
                      </div>
                    </SeatMapTooltip>
                    <span
                      className="rounded-md px-2 py-0.5 text-[15px] font-bold mt-1"
                      style={{ background: seatConfig.color, color: '#fff'}}
                    >
                      {flight.registration}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 