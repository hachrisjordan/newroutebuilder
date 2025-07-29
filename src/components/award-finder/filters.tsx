"use client";

import * as React from "react";
import { DropdownMenuCheckboxItemProps } from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Flight } from '@/types/award-finder-results';
import Image from 'next/image';
import { getAirlineLogoSrc } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { X, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function extractAirlineCodes(flights: Record<string, Flight>): string[] {
  const codes = new Set<string>();
  Object.values(flights).forEach(f => {
    const code = f.FlightNumbers.slice(0, 2).toUpperCase();
    codes.add(code);
  });
  return Array.from(codes).sort();
}

interface AirlineMeta {
  code: string;
  name: string;
}

function formatDurationMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatDateTime(dt: Date) {
  const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
  const dd = dt.getDate().toString().padStart(2, '0');
  const hh = dt.getHours().toString().padStart(2, '0');
  const min = dt.getMinutes().toString().padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}`;
}

// Add a helper for MM/DD HH:mm format (removes Z first)
function formatSliderIso(val: number) {
  const iso = new Date(val).toISOString().replace(/Z$/, '');
  // iso: '2025-07-06T18:40:00.000'
  const [date, time] = iso.split('T');
  const [year, month, day] = date.split('-');
  const [hh, mm] = time.split(':');
  return `${month}/${day} ${hh}:${mm}`;
}

export interface AirportMeta {
  code: string; // IATA
  name: string; // City or airport name
  role: 'origin' | 'destination' | 'connection';
}

export interface AirportFilterState {
  include: {
    origin: string[];
    destination: string[];
    connection: string[];
  };
  exclude: {
    origin: string[];
    destination: string[];
    connection: string[];
  };
}

interface FiltersProps {
  stopCounts: number[];
  selectedStops: number[];
  onChangeStops: (stops: number[]) => void;
  onResetStops: () => void;
  airlineMeta: AirlineMeta[];
  visibleAirlineCodes: string[];
  selectedIncludeAirlines: string[];
  selectedExcludeAirlines: string[];
  onChangeIncludeAirlines: (codes: string[]) => void;
  onChangeExcludeAirlines: (codes: string[]) => void;
  onResetAirlines: () => void;
  yPercent: number;
  wPercent: number;
  jPercent: number;
  fPercent: number;
  onYPercentChange: (value: number) => void;
  onWPercentChange: (value: number) => void;
  onJPercentChange: (value: number) => void;
  onFPercentChange: (value: number) => void;
  onResetY: () => void;
  onResetW: () => void;
  onResetJ: () => void;
  onResetF: () => void;
  minDuration: number;
  maxDuration: number;
  duration: number;
  onDurationChange: (value: number) => void;
  onResetDuration: () => void;
  depMin: number;
  depMax: number;
  depTime: [number, number] | undefined;
  arrMin: number;
  arrMax: number;
  arrTime: [number, number] | undefined;
  onDepTimeChange: (value: [number, number] | undefined) => void;
  onArrTimeChange: (value: [number, number] | undefined) => void;
  onResetDepTime: () => void;
  onResetArrTime: () => void;
  airportMeta: AirportMeta[];
  selectedAirportFilter: AirportFilterState;
  onChangeAirportFilter: (state: AirportFilterState) => void;
  onResetAirportFilter: () => void;
  isLoadingCities?: boolean;
  cityError?: string | null;
}

const Filters: React.FC<FiltersProps> = ({
  stopCounts,
  selectedStops,
  onChangeStops,
  onResetStops,
  airlineMeta,
  visibleAirlineCodes,
  selectedIncludeAirlines,
  selectedExcludeAirlines,
  onChangeIncludeAirlines,
  onChangeExcludeAirlines,
  onResetAirlines,
  yPercent,
  wPercent,
  jPercent,
  fPercent,
  onYPercentChange,
  onWPercentChange,
  onJPercentChange,
  onFPercentChange,
  onResetY,
  onResetW,
  onResetJ,
  onResetF,
  minDuration,
  maxDuration,
  duration,
  onDurationChange,
  onResetDuration,
  depMin,
  depMax,
  depTime,
  arrMin,
  arrMax,
  arrTime,
  onDepTimeChange,
  onArrTimeChange,
  onResetDepTime,
  onResetArrTime,
  airportMeta,
  selectedAirportFilter,
  onChangeAirportFilter,
  onResetAirportFilter,
  isLoadingCities,
  cityError,
}) => {
  const allStopsSelected = selectedStops.length === stopCounts.length && stopCounts.length > 0;

  const handleToggleStop = (stop: number, checked: boolean) => {
    if (checked) {
      onChangeStops([...selectedStops, stop]);
    } else {
      onChangeStops(selectedStops.filter((s) => s !== stop));
    }
  };

  const getStopsLabel = () => {
    if (selectedStops.length === 0) return "No stops selected";
    if (allStopsSelected) return "All stops";
    return stopCounts
      .filter((stop) => selectedStops.includes(stop))
      .map((stop) => (stop === 0 ? "Nonstop" : stop === 1 ? "1 stop" : `${stop} stops`))
      .join(", ");
  };

  // Airline filter state
  const [airlineTab, setAirlineTab] = React.useState<'include' | 'exclude'>('include');

  const handleToggleAirline = (code: string, checked: boolean, type: 'include' | 'exclude') => {
    if (type === 'include') {
      if (checked) onChangeIncludeAirlines([...selectedIncludeAirlines, code]);
      else onChangeIncludeAirlines(selectedIncludeAirlines.filter(c => c !== code));
    } else {
      if (checked) onChangeExcludeAirlines([...selectedExcludeAirlines, code]);
      else onChangeExcludeAirlines(selectedExcludeAirlines.filter(c => c !== code));
    }
  };

  const getAirlinesLabel = () => {
    const arr = airlineTab === 'include' ? selectedIncludeAirlines : selectedExcludeAirlines;
    if (arr.length === 0) return airlineTab === 'include' ? 'All airlines' : 'No airlines excluded';
    return arr.join(', ');
  };

  // Only show airlines present in visibleAirlineCodes
  const filteredAirlineMeta = airlineMeta.filter(a => visibleAirlineCodes.includes(a.code));

  // Helper: filter active
  function isDefault(key: string) {
    if (key === 'stops') return selectedStops.length === 0 || selectedStops.length === stopCounts.length;
    if (key === 'airlines') return selectedIncludeAirlines.length === 0 && selectedExcludeAirlines.length === 0;
    if (key === 'duration') return duration === 0 || duration === maxDuration;
    if (key === 'Y') return yPercent === 0;
    if (key === 'W') return wPercent === 0;
    if (key === 'J') return jPercent === 0;
    if (key === 'F') return fPercent === 0;
    if (key === 'depTime') return depTime === undefined || (depTime[0] === depMin && depTime[1] === depMax);
    if (key === 'arrTime') return arrTime === undefined || (arrTime[0] === arrMin && arrTime[1] === arrMax);
    return true;
  }

  const [roleTab, setRoleTab] = React.useState<'origin' | 'destination' | 'connection'>('origin');
  const [includeExcludeTab, setIncludeExcludeTab] = React.useState<'include' | 'exclude'>('include');
  const roles: Array<'origin' | 'destination' | 'connection'> = ['origin', 'destination', 'connection'];
  const airportsByRole: Record<'origin' | 'destination' | 'connection', AirportMeta[]> = {
    origin: airportMeta.filter(a => a.role === 'origin'),
    destination: airportMeta.filter(a => a.role === 'destination'),
    connection: airportMeta.filter(a => a.role === 'connection'),
  };
  const showRole = (role: 'origin' | 'destination' | 'connection') => airportsByRole[role].length > 1;
  const availableRoles = roles.filter(showRole);
  React.useEffect(() => {
    if (!availableRoles.includes(roleTab) && availableRoles.length > 0) {
      setRoleTab(availableRoles[0]);
    }
    // eslint-disable-next-line
  }, [availableRoles.length]);

  // Before rendering the airport checkbox list, define sortedAirports
  const sortedAirports: AirportMeta[] = airportsByRole[roleTab].slice().sort((a, b) => a.code.localeCompare(b.code));

  // Only show the Airports filter if at least one role has more than one airport
  const hasAnyEligibleAirportRole = roles.some(role => airportsByRole[role].length > 1);

  return (
    <div className="flex flex-row gap-3 w-full flex-wrap items-center">
      {/* Stops filter */}
      {stopCounts.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={isDefault('stops') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
              Stops
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-fit">
            <div className="flex items-center justify-between pr-2">
              <DropdownMenuLabel>Number of stops</DropdownMenuLabel>
              <button type="button" aria-label="Reset stops" onClick={onResetStops} className="ml-2 p-1 rounded hover:bg-accent">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            <DropdownMenuSeparator />
            {stopCounts.map((stop) => (
              <DropdownMenuCheckboxItem
                key={stop}
                checked={selectedStops.includes(stop)}
                onCheckedChange={checked => handleToggleStop(stop, checked as boolean)}
                onSelect={e => e.preventDefault()}
              >
                {stop === 0 ? "Nonstop" : stop === 1 ? "1 stop" : `${stop} stops`}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* Airlines filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('airlines') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
            Airlines
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Airlines</DropdownMenuLabel>
            <button type="button" aria-label="Reset airlines" onClick={onResetAirlines} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <Tabs value={airlineTab} onValueChange={v => setAirlineTab(v as 'include' | 'exclude')} className="w-full">
            <TabsList className="w-full flex mb-2">
              <TabsTrigger value="include" className="flex-1">Include</TabsTrigger>
              <TabsTrigger value="exclude" className="flex-1">Exclude</TabsTrigger>
            </TabsList>
            <TabsContent value="include">
              <div className="max-h-72 overflow-y-auto">
                {filteredAirlineMeta.map(({ code, name }) => (
                  <DropdownMenuCheckboxItem
                    key={code}
                    checked={selectedIncludeAirlines.includes(code)}
                    onCheckedChange={checked => handleToggleAirline(code, checked as boolean, 'include')}
                    onSelect={e => e.preventDefault()}
                  >
                    <span className="flex items-center gap-2">
                      <Image
                        src={getAirlineLogoSrc(code)}
                        alt={code}
                        width={24}
                        height={24}
                        className="rounded-md object-contain"
                        unoptimized
                      />
                      <span>{name} <span className="font-bold">- {code}</span></span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="exclude">
              <div className="max-h-72 overflow-y-auto">
                {filteredAirlineMeta.map(({ code, name }) => (
                  <DropdownMenuCheckboxItem
                    key={code}
                    checked={selectedExcludeAirlines.includes(code)}
                    onCheckedChange={checked => handleToggleAirline(code, checked as boolean, 'exclude')}
                    onSelect={e => e.preventDefault()}
                  >
                    <span className="flex items-center gap-2">
                      <Image
                        src={getAirlineLogoSrc(code)}
                        alt={code}
                        width={24}
                        height={24}
                        className="rounded-md object-contain"
                        unoptimized
                      />
                      <span>{name} <span className="font-bold">- {code}</span></span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Duration filter */}
      {maxDuration > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={isDefault('duration') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
              Duration
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-fit">
            <div className="flex items-center justify-between pr-2">
              <DropdownMenuLabel>Max Duration</DropdownMenuLabel>
              <button type="button" aria-label="Reset duration" onClick={onResetDuration} className="ml-2 p-1 rounded hover:bg-accent">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 w-56 flex flex-col gap-2">
              <Slider min={minDuration} max={maxDuration} step={5} value={[duration]} onValueChange={([v]) => onDurationChange(v)} />
              <div className="text-xs text-center">{formatDurationMinutes(duration)}</div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* Y filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('Y') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
            Y
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Economy % minimum</DropdownMenuLabel>
            <button type="button" aria-label="Reset Y" onClick={onResetY} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-52 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Slider min={0} max={100} step={1} value={[yPercent]} onValueChange={([v]) => onYPercentChange(v)} className="flex-1" />
              <Input
                type="number"
                min={0}
                max={100}
                value={yPercent}
                onChange={e => {
                  const val = Math.max(0, Math.min(100, Number(e.target.value)));
                  onYPercentChange(val);
                }}
                className="w-14 h-8 text-center px-2 py-1"
              />
              <span className="text-xs">%</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* W filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('W') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
            W
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Premium Economy % minimum</DropdownMenuLabel>
            <button type="button" aria-label="Reset W" onClick={onResetW} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-52 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Slider min={0} max={100} step={1} value={[wPercent]} onValueChange={([v]) => onWPercentChange(v)} className="flex-1" />
              <Input
                type="number"
                min={0}
                max={100}
                value={wPercent}
                onChange={e => {
                  const val = Math.max(0, Math.min(100, Number(e.target.value)));
                  onWPercentChange(val);
                }}
                className="w-14 h-8 text-center px-2 py-1"
              />
              <span className="text-xs">%</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* J filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('J') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
            J
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Business % minimum</DropdownMenuLabel>
            <button type="button" aria-label="Reset J" onClick={onResetJ} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-52 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Slider min={0} max={100} step={1} value={[jPercent]} onValueChange={([v]) => onJPercentChange(v)} className="flex-1" />
              <Input
                type="number"
                min={0}
                max={100}
                value={jPercent}
                onChange={e => {
                  const val = Math.max(0, Math.min(100, Number(e.target.value)));
                  onJPercentChange(val);
                }}
                className="w-14 h-8 text-center px-2 py-1"
              />
              <span className="text-xs">%</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* F filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('F') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
            F
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>First % minimum</DropdownMenuLabel>
            <button type="button" aria-label="Reset F" onClick={onResetF} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-52 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Slider min={0} max={100} step={1} value={[fPercent]} onValueChange={([v]) => onFPercentChange(v)} className="flex-1" />
              <Input
                type="number"
                min={0}
                max={100}
                value={fPercent}
                onChange={e => {
                  const val = Math.max(0, Math.min(100, Number(e.target.value)));
                  onFPercentChange(val);
                }}
                className="w-14 h-8 text-center px-2 py-1"
              />
              <span className="text-xs">%</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Departure time filter */}
      {depMin > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={isDefault('depTime') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
              Departure
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-fit">
            <div className="flex items-center justify-between pr-2">
              <DropdownMenuLabel>Departure Time</DropdownMenuLabel>
              <button type="button" aria-label="Reset Departure Time" onClick={onResetDepTime} className="ml-2 p-1 rounded hover:bg-accent">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 w-64 flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
              <Slider 
                min={depMin} 
                max={depMax} 
                value={depTime || [depMin, depMax]} 
                onValueChange={v => onDepTimeChange(v as [number, number])} 
                step={60 * 1000} 
              />
              <div className="text-xs text-center">
                {formatSliderIso((depTime || [depMin, depMax])[0])} - {formatSliderIso((depTime || [depMin, depMax])[1])}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* Arrival time filter */}
      {arrMin > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={isDefault('arrTime') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
              Arrival
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-fit">
            <div className="flex items-center justify-between pr-2">
              <DropdownMenuLabel>Arrival Time</DropdownMenuLabel>
              <button type="button" aria-label="Reset Arrival Time" onClick={onResetArrTime} className="ml-2 p-1 rounded hover:bg-accent">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 w-64 flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
              <Slider 
                min={arrMin} 
                max={arrMax} 
                value={arrTime || [arrMin, arrMax]} 
                onValueChange={v => onArrTimeChange(v as [number, number])} 
                step={60 * 1000} 
              />
              <div className="text-xs text-center">
                {formatSliderIso((arrTime || [arrMin, arrMax])[0])} - {formatSliderIso((arrTime || [arrMin, arrMax])[1])}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* Airports filter */}
      {hasAnyEligibleAirportRole && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={isDefault('airports') ? 'outline' : 'default'} className={cn('justify-start px-4 py-2')}>
              Airports
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-fit">
            <div className="flex items-center justify-between pr-2">
              <DropdownMenuLabel>Airports</DropdownMenuLabel>
              <button type="button" aria-label="Reset airports" onClick={onResetAirportFilter} className="ml-2 p-1 rounded hover:bg-accent">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            <DropdownMenuSeparator />
            {/* Role Tabs (Origin/Destination/Connection) */}
            <Tabs value={roleTab} onValueChange={v => setRoleTab(v as 'origin' | 'destination' | 'connection')} className="w-full mb-2">
              <TabsList className="w-full flex">
                {availableRoles.map(role => (
                  <TabsTrigger key={role} value={role} className="flex-1">{role.charAt(0).toUpperCase() + role.slice(1)}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {/* Include/Exclude Button Group */}
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant={includeExcludeTab === 'include' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setIncludeExcludeTab('include')}
              >
                Include
              </Button>
              <Button
                variant={includeExcludeTab === 'exclude' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setIncludeExcludeTab('exclude')}
              >
                Exclude
              </Button>
            </div>
            {/* Checkbox list for airports in selected role and mode */}
            <div className="max-h-60 overflow-y-auto">
              {sortedAirports.map((airport) => (
                <div key={airport.code} className="flex items-center gap-2">
                  <DropdownMenuCheckboxItem
                    checked={selectedAirportFilter[includeExcludeTab][roleTab].includes(airport.code)}
                    onCheckedChange={checked => {
                      const next = { ...selectedAirportFilter };
                      if (checked) next[includeExcludeTab][roleTab] = [...next[includeExcludeTab][roleTab], airport.code];
                      else next[includeExcludeTab][roleTab] = next[includeExcludeTab][roleTab].filter(c => c !== airport.code);
                      onChangeAirportFilter(next);
                    }}
                    onSelect={e => e.preventDefault()}
                  >
                    <span className="flex items-center gap-2">
                      <span>{airport.code} - {airport.name.replace(/^.*? - /, '')}</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default Filters; 