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
import { formatDivertedOntime } from "@/lib/utils"
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { addMonths, isSameMonth } from 'date-fns';
import { useTheme } from 'next-themes';

interface FlightData {
  flightNumber: string;
  date: string;
  registration: string;
  origin: string;
  destination: string;
  ontime: string;
}

interface FlightCalendarProps {
  flightData: FlightData[];
}

export function FlightCalendar({ flightData }: FlightCalendarProps) {
  // Early return: no data
  if (!flightData || flightData.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No flight data available.</div>;
  }

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

  if (months.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No months to display.</div>;
  }

  // Default to the latest month with a non-N/A registration
  const latestValidDate = React.useMemo(() => {
    const valid = flightData.filter(f => f.registration && f.registration !== 'N/A');
    if (valid.length === 0) return null;
    // Find the latest date
    return valid.reduce((latest, curr) => (curr.date > latest.date ? curr : latest)).date;
  }, [flightData]);
  const latestValidMonth = latestValidDate ? `${latestValidDate.split('-')[0]}-${parseInt(latestValidDate.split('-')[1], 10)}` : null;
  const defaultMonthIndex = React.useMemo(() => {
    if (!latestValidMonth) return months.length > 0 ? months.length - 1 : 0;
    const idx = months.findIndex(m => m === latestValidMonth);
    return idx !== -1 ? idx : (months.length > 0 ? months.length - 1 : 0);
  }, [months, latestValidMonth]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(defaultMonthIndex);

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
    // Extract year and month from date string (YYYY-MM-DD)
    const [fYear, fMonth] = flight.date.split('-').map(Number);
    return fYear === parseInt(year) && fMonth === parseInt(month);
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
  // Airline code (from first flight, fallback to 'JL')
  const airline = filteredFlights[0]?.flightNumber?.slice(0, 2) || 'JL';

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

  // Dynamic seat config state
  const [seatConfigData, setSeatConfigData] = useState<any | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!airline) return;
    setConfigLoading(true);
    fetch(`/api/aircraft-config/${airline}`)
      .then(res => res.json())
      .then(data => setSeatConfigData(data))
      .catch(() => setSeatConfigData(null))
      .finally(() => setConfigLoading(false));
  }, [airline]);

  // Helper: Find seat config for a registration
  function getSeatConfig(registration: string) {
    if (!seatConfigData || !registration || registration === 'N/A') return null;
    
    // Type guard for seatConfigData structure
    if (!seatConfigData.tail_number_distribution) {
      console.warn('Invalid seat config data structure:', seatConfigData);
      return null;
    }

    const tailMap = seatConfigData.tail_number_distribution as Record<string, string | { default: string; changes: Array<{ date: string; variant: string }> }>;
    let variant = tailMap[registration];
    
    // Handle date-based configuration changes
    if (variant && typeof variant === 'object' && 'changes' in variant) {
      // Sort changes by date in descending order
      const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Find the most recent change that applies to the current date
      const applicableChange = sortedChanges.find(change => new Date() >= new Date(change.date));
      
      // Use the applicable change's variant, or fall back to default
      variant = applicableChange ? applicableChange.variant : variant.default;
    }

    if (!variant) return null;

    // Try both configs_by_type and configurations_by_type
    const configsByType = seatConfigData.configs_by_type || seatConfigData.configurations_by_type;
    if (!configsByType || typeof configsByType !== 'object') {
      console.warn('Invalid configs_by_type structure:', configsByType);
      return null;
    }

    for (const [aircraftType, configs] of Object.entries(configsByType)) {
      if (!Array.isArray(configs)) continue;
      const found = configs.find(cfg => cfg.variant === variant);
      if (found) {
        return { aircraftType, ...found };
      }
    }
    return null;
  }

  // Only return a flight if the date matches exactly
  const getFlightForDate = (targetDateStr: string): FlightData | undefined => {
    return filteredFlights.find(f => f.date === targetDateStr);
  };

  // Helper: Delay status color and text logic from seat-type-viewer.jsx
  function getOntimeStatus(ontime: string, date: string) {
    if (!ontime) return null;
    if (ontime === 'CANCELED') {
      return { color: '#000000', text: 'Canceled' };
    }
    if (ontime.startsWith('Diverted to')) {
      return { color: '#9c27b0', text: formatDivertedOntime(ontime) };
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
    if (minutes === 0) text = 'On time';
    else if (minutes < 0) text = `${Math.abs(minutes)}m early`;
    else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      const timeStr = remainingMinutes > 0 ? `${hours}h${remainingMinutes}m` : `${hours}h`;
      text = `${timeStr} late`;
    } else text = `${minutes}m late`;
    return { color, text };
  }

  // Build variant count based on visible calendar days
  const variantCountsByDay = new Map<string, number>();
  const variantInfo = new Map<string, { color: string; aircraftType: string; note: string }>();
  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, day));
    const dateStr = dateObj.toISOString().split('T')[0];
    const flight: FlightData | undefined = getFlightForDate(dateStr);
    const seatConfig = flight ? getSeatConfig(flight.registration) : null;
    if (flight && flight.registration && flight.registration !== 'N/A' && seatConfig) {
      variantCountsByDay.set(seatConfig.variant, (variantCountsByDay.get(seatConfig.variant) || 0) + 1);
      if (!variantInfo.has(seatConfig.variant)) {
        variantInfo.set(seatConfig.variant, {
          color: seatConfig.color,
          aircraftType: seatConfig.aircraftType,
          note: seatConfig.note,
        });
      }
    }
  }
  const variantStats = Array.from(variantCountsByDay.entries()).sort((a, b) => b[1] - a[1]);
  const allVariants = variantStats.map(([variant]) => variant);
  const [selectedVariants, setSelectedVariants] = useState<string[]>(allVariants);
  useEffect(() => {
    setSelectedVariants(allVariants);
    // eslint-disable-next-line
  }, [currentMonthKey, allVariants.join(",")]);

  // Add after useEffect for selectedVariants
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Helper: get flight and seat config for a date
  function getFlightAndConfig(dateStr: string) {
    const flight: FlightData | undefined = getFlightForDate(dateStr);
    const seatConfig = flight ? getSeatConfig(flight.registration) : null;
    return { flight, seatConfig };
  }

  // Helper to determine if a color is dark (for badge text contrast)
  function isDarkColor(hex: string): boolean {
    if (!hex) return false;
    const c = hex.replace('#', '');
    const rgb = parseInt(c.length === 3
      ? c.split('').map(x => x + x).join('')
      : c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    return (0.299 * r + 0.587 * g + 0.114 * b) < 150;
  }

  return (
    <>
      {/* Desktop/Tablet calendar (>=1000px) */}
      <div className="hidden lg:block">
        <Card className="w-full mx-auto">
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
              <div className="mb-4 flex justify-end w-full">
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
              {/* Render each week as a row of 7 cells; use invisible divs for non-date slots to preserve alignment */}
              {(() => {
                const weeks: (number | null)[][] = [];
                let currentDay = 1;
                const totalSlots = Math.ceil((startingDay + totalDays) / 7) * 7;
                for (let i = 0; i < totalSlots; i += 7) {
                  const week: (number | null)[] = [];
                  for (let j = 0; j < 7; j++) {
                    const slot = i + j;
                    if (slot < startingDay) {
                      week.push(null);
                    } else if (currentDay > totalDays) {
                      week.push(null);
                    } else {
                      week.push(currentDay);
                      currentDay++;
                    }
                  }
                  weeks.push(week);
                }
                // Render each week as a row of 7 cells
                return weeks.flat().map((day, idx) => {
                  if (!day) {
                    // Render invisible cell to preserve grid structure
                    return <div key={`empty-${idx}`} className="invisible border rounded-md p-2 min-h-[120px]" />;
                  }
                  // Use UTC and ISO string for robust date handling
                  const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, day));
                  const dateStr = dateObj.toISOString().split('T')[0];
                  const flight: FlightData | undefined = getFlightForDate(dateStr);
                  const seatConfig = flight ? getSeatConfig(flight.registration) : null;
                  // Show delay status if flight exists and (registration is valid and selected, or registration is 'N/A' and ontime is CANCELED)
                  const isCanceled = flight && flight.registration === 'N/A' && flight.ontime === 'CANCELED';
                  const isValid = (flight && flight.registration && flight.registration !== 'N/A' && seatConfig && selectedVariants.includes(seatConfig.variant)) || isCanceled;

                  return (
                    <div
                      key={day}
                      className="border rounded-md p-2 text-sm hover:bg-accent transition-colors relative h-full min-h-[120px] pt-10"
                    >
                      {/* Top row: delay status (left) and day number (right, with border) */}
                      <div className="absolute top-1 left-2 right-2 flex flex-row items-center justify-between w-auto">
                        {(() => {
                          const status = (isValid && flight) ? getOntimeStatus(flight.ontime, dateStr) : null;
                          if (!status) return <span />;
                          let dotColor = status.color;
                          let textColor = status.color;
                          if (flight && flight.ontime === 'CANCELED' && resolvedTheme === 'dark') {
                            dotColor = '#fff';
                            textColor = '#fff';
                          }
                          return (
                            <span className="flex items-center gap-1" style={{ color: textColor }}>
                              <span style={{
                                display: 'inline-block',
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: dotColor,
                                marginRight: 4
                              }} />
                              <span className="font-medium text-xs">{status.text}</span>
                            </span>
                          );
                        })()}
                        <span className="font-medium text-base border-r-2 border-gray-300 pr-2 font-bold">{day}</span>
                      </div>
                      {/* Main content */}
                      {isValid && !configLoading && seatConfig ? (
                        <div className="flex flex-col items-center h-full min-h-[80px] gap-1 justify-between">
                          <div>
                            <div className="font-bold text-[15px] text-center leading-tight">
                              {seatConfig.aircraftType} <span className="font-mono">({seatConfig.variant})</span>
                            </div>
                            <div className="text-[12px] font-mono text-center">{seatConfig.config}</div>
                            <SeatMapTooltip airline={airline} variant={seatConfig.variant} aircraftType={seatConfig.aircraftType}>
                              <div className="text-[12px] text-muted-foreground text-center italic underline underline-offset-2">
                                {seatConfig.note}
                              </div>
                            </SeatMapTooltip>
                          </div>
                          <div className="w-full flex justify-center mt-auto">
                            <span
                              className="rounded-md px-2 py-0.5 text-[15px] font-bold"
                              style={{ background: seatConfig.color, color: '#fff'}}
                            >
                              {flight.registration}
                            </span>
                          </div>
                        </div>
                      ) : isCanceled ? (
                        <div className="flex flex-col items-center h-full min-h-[80px] gap-1 justify-between">
                          {/* Only show the status dot and text for canceled flights with N/A registration */}
                        </div>
                      ) : null}
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile compact calendar (<1000px) */}
      <div className="block lg:hidden">
        {/* Variant multi-select dropdown, right-aligned, mobile */}
        {variantStats.length > 0 && (
          <div className="mb-4 flex justify-end w-full">
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
        <div className="w-full max-w-[1000px] p-1 sm:p-2 mx-auto">
          <ShadcnCalendar
            mode="single"
            month={new Date(Number(year), Number(month) - 1)}
            onMonthChange={(date: Date) => {
              // Find the index in months array for the new month
              const idx = months.findIndex(m => {
                const [y, mth] = m.split('-');
                return Number(y) === date.getFullYear() && Number(mth) === date.getMonth() + 1;
              });
              if (idx !== -1) setCurrentMonthIndex(idx);
            }}
            selected={selectedDate ? new Date(selectedDate) : undefined}
            onSelect={(date: Date | undefined) => {
              console.log('onSelect', date);
              setSelectedDate(date ? date.toISOString().split('T')[0] : null);
            }}
            className="rounded-md border"
            components={{
              Day: (props: any) => {
                const dateObj = props.date;
                const dateStr = dateObj.toISOString().split('T')[0];
                // Only enable days in the current visible month
                const isInCurrentMonth = isSameMonth(dateObj, new Date(Number(year), Number(month) - 1));
                // Use filteredFlights and airline logic from desktop
                const flight: FlightData | undefined = getFlightForDate(dateStr);
                const seatConfig = flight ? getSeatConfig(flight.registration) : null;
                // Show delay status if flight exists and (registration is valid and selected, or registration is 'N/A' and ontime is CANCELED)
                const isCanceled = flight && flight.registration === 'N/A' && flight.ontime === 'CANCELED';
                const isValid = (flight && flight.registration && flight.registration !== 'N/A' && seatConfig && selectedVariants.includes(seatConfig.variant)) || isCanceled;
                // Delay status color
                let delayColor = '#9e9e9e';
                let showStatus = false;
                let status = null;
                if (isValid) {
                  status = getOntimeStatus(flight.ontime, dateStr);
                  if (status) {
                    delayColor = status.color;
                    showStatus = true;
                  }
                }
                // Show white dot for canceled in dark mode
                if (flight && flight.ontime === 'CANCELED' && resolvedTheme === 'dark') {
                  delayColor = '#fff';
                  showStatus = true;
                  status = getOntimeStatus(flight.ontime, dateStr);
                }
                const isSelected = selectedDate === dateStr;
                // Determine badge text color for contrast
                let badgeTextColor = '';
                if (isValid && seatConfig) {
                  badgeTextColor = isDarkColor(seatConfig.color) ? '#fff' : '#111';
                }
                return (
                  <button
                    {...props}
                    className={cn(
                      'flex flex-col items-center justify-center w-12 h-12 rounded-md focus:outline-none',
                      isSelected ? 'ring-2 ring-primary ring-offset-2' : '',
                      !isValid && 'opacity-50'
                    )}
                    aria-label={`Show details for ${dateStr}`}
                    onClick={e => {
                      e.stopPropagation();
                      console.log('Button clicked', dateStr);
                      setSelectedDate(dateStr);
                    }}
                  >
                    {/* Date number with badge background if valid */}
                    <span
                      className={cn(
                        'text-base font-bold mb-0.5 flex items-center justify-center w-8 h-8 rounded-full border',
                        isValid && seatConfig ? 'border-black/10 dark:border-white/20' : 'bg-gray-200 dark:bg-zinc-800',
                        isValid && seatConfig ? '' : 'text-gray-400'
                      )}
                      style={isValid && seatConfig ? { background: seatConfig.color, color: badgeTextColor } : {}}
                    >
                      {dateObj.getDate()}
                    </span>
                    {/* Dot for delay status */}
                    {showStatus && (
                      <span className="w-2 h-2 rounded-full" style={{ background: delayColor }} />
                    )}
                  </button>
                );
              }
            }}
          />
        </div>
        {/* Modal for selected date */}
        <Dialog open={!!selectedDate} onOpenChange={open => !open && setSelectedDate(null)}>
          <DialogContent className="max-w-xs w-full p-4 sm:max-w-sm text-center break-words rounded-lg">
            {selectedDate && (() => {
              const { flight, seatConfig } = getFlightAndConfig(selectedDate);
              if (!flight) return <div className="text-center text-gray-500">No data for this date.</div>;
              // If canceled, show status even if registration is N/A
              const isCanceled = flight.ontime === 'CANCELED';
              return (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-lg font-bold">{selectedDate}</div>
                  {seatConfig && (
                    <>
                      <div className="font-bold text-[15px] text-center leading-tight">
                        {seatConfig.aircraftType} <span className="font-mono">({seatConfig.variant})</span>
                      </div>
                      <div className="text-[12px] font-mono text-center">{seatConfig.config}</div>
                      <SeatMapTooltip airline={airline} variant={seatConfig.variant} aircraftType={seatConfig.aircraftType}>
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
                    </>
                  )}
                  {/* Delay status for canceled flights or valid flights */}
                  {(() => {
                    const status = getOntimeStatus(flight.ontime, selectedDate);
                    if (!status) return null;
                    let dotColor = status.color;
                    let textColor = status.color;
                    if (flight.ontime === 'CANCELED' && resolvedTheme === 'dark') {
                      dotColor = '#fff';
                      textColor = '#fff';
                    }
                    return (
                      <span className="mt-2 font-medium text-xs" style={{ color: textColor }}>
                        <span style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: dotColor,
                          marginRight: 4
                        }} />
                        {status.text}
                      </span>
                    );
                  })()}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
} 