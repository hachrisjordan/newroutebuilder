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

interface FiltersProps {
  stopCounts: number[];
  selectedStops: number[];
  onChangeStops: (stops: number[]) => void;
  airlineMeta: AirlineMeta[];
  visibleAirlineCodes: string[];
  selectedIncludeAirlines: string[];
  selectedExcludeAirlines: string[];
  onChangeIncludeAirlines: (codes: string[]) => void;
  onChangeExcludeAirlines: (codes: string[]) => void;
  yPercent: number;
  wPercent: number;
  jPercent: number;
  fPercent: number;
  onYPercentChange: (value: number) => void;
  onWPercentChange: (value: number) => void;
  onJPercentChange: (value: number) => void;
  onFPercentChange: (value: number) => void;
  minDuration: number;
  maxDuration: number;
  duration: number;
  onDurationChange: (value: number) => void;
}

const Filters: React.FC<FiltersProps> = ({
  stopCounts,
  selectedStops,
  onChangeStops,
  airlineMeta,
  visibleAirlineCodes,
  selectedIncludeAirlines,
  selectedExcludeAirlines,
  onChangeIncludeAirlines,
  onChangeExcludeAirlines,
  yPercent,
  wPercent,
  jPercent,
  fPercent,
  onYPercentChange,
  onWPercentChange,
  onJPercentChange,
  onFPercentChange,
  minDuration,
  maxDuration,
  duration,
  onDurationChange,
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

  return (
    <div className="flex flex-row gap-3 w-full flex-wrap items-center">
      {/* Stops filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-start px-4 py-2">
            {getStopsLabel()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <DropdownMenuLabel>Number of stops</DropdownMenuLabel>
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
      {/* Airlines filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-start px-4 py-2">
            Airlines
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <DropdownMenuLabel>Airlines</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Tabs value={airlineTab} onValueChange={v => setAirlineTab(v as 'include' | 'exclude')} className="w-full">
            <TabsList className="w-full flex mb-2">
              <TabsTrigger value="include" className="flex-1">Include</TabsTrigger>
              <TabsTrigger value="exclude" className="flex-1">Exclude</TabsTrigger>
            </TabsList>
            <TabsContent value="include">
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
            </TabsContent>
            <TabsContent value="exclude">
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
            </TabsContent>
          </Tabs>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Duration filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-start px-4 py-2">
            Duration ≤ {formatDurationMinutes(duration)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <DropdownMenuLabel>Max Duration</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-56 flex flex-col gap-2">
            <Slider min={minDuration} max={maxDuration} step={5} value={[duration]} onValueChange={([v]) => onDurationChange(v)} />
            <div className="text-xs text-center">{formatDurationMinutes(duration)}</div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Y filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-start px-4 py-2">
            Y ≥ {yPercent}%
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <DropdownMenuLabel>Y % minimum</DropdownMenuLabel>
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
          <Button variant="outline" className="justify-start px-4 py-2">
            W ≥ {wPercent}%
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <DropdownMenuLabel>W % minimum</DropdownMenuLabel>
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
          <Button variant="outline" className="justify-start px-4 py-2">
            J ≥ {jPercent}%
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <DropdownMenuLabel>J % minimum</DropdownMenuLabel>
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
          <Button variant="outline" className="justify-start px-4 py-2">
            F ≥ {fPercent}%
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <DropdownMenuLabel>F % minimum</DropdownMenuLabel>
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
    </div>
  );
};

export default Filters; 