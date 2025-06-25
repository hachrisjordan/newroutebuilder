import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for itinerary and bundle
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
  segments: Array<{
    from: string;
    to: string;
    aircraft: string;
    stops: number;
    depart: string;
    arrive: string;
    flightnumber: string;
    duration: number;
    layover?: number;
    distance: number;
    bundleClasses?: Array<Record<string, string>>;
  }>;
  __program?: string;
}

export interface LiveSearchFiltersState {
  dates: string[];
  classes: string[];
  yPoints: [number, number];
  wPoints: [number, number];
  jPoints: [number, number];
  fPoints: [number, number];
  depTime: [number, number];
  arrTime: [number, number];
}

interface LiveSearchFiltersProps {
  allItins: Itinerary[];
  filterState: LiveSearchFiltersState;
  onFilterChange: (state: LiveSearchFiltersState) => void;
}

const CLASS_OPTIONS = [
  { value: 'Y', label: 'Economy (Y)' },
  { value: 'W', label: 'Premium Economy (W)' },
  { value: 'J', label: 'Business (J)' },
  { value: 'F', label: 'First (F)' },
];

function getDate(iso: string) {
  return iso.slice(0, 10);
}
function getMinutesOfDay(iso: string) {
  const t = iso.split('T')[1];
  if (!t) return 0;
  const [h, m] = t.split(':');
  return Number(h) * 60 + Number(m);
}
function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatDateTime(dt: Date) {
  // Format as MM-DD HH:mm
  const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
  const dd = dt.getDate().toString().padStart(2, '0');
  const hh = dt.getHours().toString().padStart(2, '0');
  const min = dt.getMinutes().toString().padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}`;
}

const LiveSearchFilters: React.FC<LiveSearchFiltersProps> = ({ allItins, filterState, onFilterChange }) => {
  // --- Compute filter options and min/max ---
  const dateOptions = useMemo(() =>
    Array.from(new Set(allItins.map(i => getDate(i.depart)))).sort(),
    [allItins]
  );
  const classOptions = useMemo(() =>
    Array.from(new Set(allItins.flatMap(i => i.bundles.map(b => b.class)))).filter(c => ['Y','W','J','F'].includes(c)),
    [allItins]
  );
  // Points min/max for each class
  function getPointsRange(cls: string): [number, number] {
    const pts = allItins.flatMap(i => i.bundles.filter(b => b.class === cls).map(b => Number(b.points)));
    if (!pts.length) return [0, 0];
    return [Math.min(...pts), Math.max(...pts)];
  }
  const yRange = getPointsRange('Y');
  const wRange = getPointsRange('W');
  const jRange = getPointsRange('J');
  const fRange = getPointsRange('F');

  // Departure/arrival datetime min/max
  const depDates = allItins.map(i => new Date(i.depart)).filter(d => !isNaN(d.getTime()));
  const arrDates = allItins.map(i => new Date(i.arrive)).filter(d => !isNaN(d.getTime()));
  const depMinDate = depDates.length ? new Date(Math.min(...depDates.map(d => d.getTime()))) : new Date();
  const depMaxDate = depDates.length ? new Date(Math.max(...depDates.map(d => d.getTime()))) : new Date();
  const arrMinDate = arrDates.length ? new Date(Math.min(...arrDates.map(d => d.getTime()))) : new Date();
  const arrMaxDate = arrDates.length ? new Date(Math.max(...arrDates.map(d => d.getTime()))) : new Date();

  // Convert to slider values (ms since epoch)
  const depMin = depMinDate.getTime();
  const depMax = depMaxDate.getTime();
  const arrMin = arrMinDate.getTime();
  const arrMax = arrMaxDate.getTime();

  // --- Local state for dropdowns ---
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [pendingDates, setPendingDates] = useState(filterState.dates);
  const [isClassOpen, setIsClassOpen] = useState(false);
  const [pendingClasses, setPendingClasses] = useState(filterState.classes);

  // --- Helper: filter active ---
  function isDefault(key: keyof LiveSearchFiltersState) {
    if (key === 'dates') return filterState.dates.length === 0;
    if (key === 'classes') return filterState.classes.length === 0;
    if (key === 'yPoints') return filterState.yPoints[0] === yRange[0] && filterState.yPoints[1] === yRange[1];
    if (key === 'wPoints') return filterState.wPoints[0] === wRange[0] && filterState.wPoints[1] === wRange[1];
    if (key === 'jPoints') return filterState.jPoints[0] === jRange[0] && filterState.jPoints[1] === jRange[1];
    if (key === 'fPoints') return filterState.fPoints[0] === fRange[0] && filterState.fPoints[1] === fRange[1];
    if (key === 'depTime') return filterState.depTime[0] === depMin && filterState.depTime[1] === depMax;
    if (key === 'arrTime') return filterState.arrTime[0] === arrMin && filterState.arrTime[1] === arrMax;
    return true;
  }

  // --- Handlers ---
  function handleDatesChange(val: string) {
    let next: string[];
    if (pendingDates.includes(val)) next = pendingDates.filter(f => f !== val);
    else next = [...pendingDates, val];
    setPendingDates(next);
    onFilterChange({ ...filterState, dates: next });
  }
  function handleClassesChange(val: string) {
    let next: string[];
    if (pendingClasses.includes(val)) next = pendingClasses.filter(f => f !== val);
    else next = [...pendingClasses, val];
    setPendingClasses(next);
    onFilterChange({ ...filterState, classes: next });
  }
  function handleSliderChange(key: keyof LiveSearchFiltersState, value: [number, number]) {
    onFilterChange({ ...filterState, [key]: value });
  }
  function handleReset(key: keyof LiveSearchFiltersState, def: any) {
    onFilterChange({ ...filterState, [key]: def });
  }

  return (
    <div className="flex flex-wrap gap-4 items-center mb-4 w-full">
      {/* Date multi-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('dates') ? "outline" : "default"} className={cn("w-36 justify-start truncate overflow-hidden text-ellipsis")}>Date</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Date</DropdownMenuLabel>
            <button type="button" aria-label="Reset Date" onClick={() => { setPendingDates([]); onFilterChange({ ...filterState, dates: [] }); }} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          {dateOptions.map(opt => (
            <DropdownMenuCheckboxItem
              key={opt}
              checked={filterState.dates.includes(opt)}
              onCheckedChange={checked => {
                let next: string[];
                if (checked) next = [...filterState.dates, opt];
                else next = filterState.dates.filter(f => f !== opt);
                onFilterChange({ ...filterState, dates: next });
              }}
              onSelect={e => e.preventDefault()}
            >
              {opt}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Class multi-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('classes') ? "outline" : "default"} className={cn("w-36 justify-start truncate overflow-hidden text-ellipsis")}>Class</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Class</DropdownMenuLabel>
            <button type="button" aria-label="Reset Class" onClick={() => { setPendingClasses([]); onFilterChange({ ...filterState, classes: [] }); }} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          {CLASS_OPTIONS.filter(opt => classOptions.includes(opt.value)).map(opt => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={filterState.classes.includes(opt.value)}
              onCheckedChange={checked => {
                let next: string[];
                if (checked) next = [...filterState.classes, opt.value];
                else next = filterState.classes.filter(f => f !== opt.value);
                onFilterChange({ ...filterState, classes: next });
              }}
              onSelect={e => e.preventDefault()}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Y Point filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('yPoints') ? "outline" : "default"} className={cn("justify-start px-4 py-2")}>Y</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Y Points</DropdownMenuLabel>
            <button type="button" aria-label="Reset Y Points" onClick={() => handleReset('yPoints', yRange)} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-56 flex flex-col gap-2">
            <Slider min={yRange[0]} max={yRange[1]} value={filterState.yPoints} onValueChange={v => handleSliderChange('yPoints', v as [number, number])} step={1000} />
            <div className="text-xs text-center">{filterState.yPoints[0]} - {filterState.yPoints[1]}</div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* W Point filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('wPoints') ? "outline" : "default"} className={cn("justify-start px-4 py-2")}>W</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>W Points</DropdownMenuLabel>
            <button type="button" aria-label="Reset W Points" onClick={() => handleReset('wPoints', wRange)} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-56 flex flex-col gap-2">
            <Slider min={wRange[0]} max={wRange[1]} value={filterState.wPoints} onValueChange={v => handleSliderChange('wPoints', v as [number, number])} step={1000} />
            <div className="text-xs text-center">{filterState.wPoints[0]} - {filterState.wPoints[1]}</div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* J Point filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('jPoints') ? "outline" : "default"} className={cn("justify-start px-4 py-2")}>J</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>J Points</DropdownMenuLabel>
            <button type="button" aria-label="Reset J Points" onClick={() => handleReset('jPoints', jRange)} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-56 flex flex-col gap-2">
            <Slider min={jRange[0]} max={jRange[1]} value={filterState.jPoints} onValueChange={v => handleSliderChange('jPoints', v as [number, number])} step={1000} />
            <div className="text-xs text-center">{filterState.jPoints[0]} - {filterState.jPoints[1]}</div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* F Point filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('fPoints') ? "outline" : "default"} className={cn("justify-start px-4 py-2")}>F</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>F Points</DropdownMenuLabel>
            <button type="button" aria-label="Reset F Points" onClick={() => handleReset('fPoints', fRange)} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-56 flex flex-col gap-2">
            <Slider min={fRange[0]} max={fRange[1]} value={filterState.fPoints} onValueChange={v => handleSliderChange('fPoints', v as [number, number])} step={1000} />
            <div className="text-xs text-center">{filterState.fPoints[0]} - {filterState.fPoints[1]}</div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Departure time filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('depTime') ? "outline" : "default"} className={cn("justify-start px-4 py-2")}>Departure</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Departure Time</DropdownMenuLabel>
            <button type="button" aria-label="Reset Departure Time" onClick={() => handleReset('depTime', [depMin, depMax])} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-64 flex flex-col gap-2">
            <Slider min={depMin} max={depMax} value={filterState.depTime} onValueChange={v => handleSliderChange('depTime', v as [number, number])} step={15 * 60 * 1000} />
            <div className="text-xs text-center">{formatDateTime(new Date(filterState.depTime[0]))} - {formatDateTime(new Date(filterState.depTime[1]))}</div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Arrival time filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={isDefault('arrTime') ? "outline" : "default"} className={cn("justify-start px-4 py-2")}>Arrival</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-fit">
          <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Arrival Time</DropdownMenuLabel>
            <button type="button" aria-label="Reset Arrival Time" onClick={() => handleReset('arrTime', [arrMin, arrMax])} className="ml-2 p-1 rounded hover:bg-accent">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 w-64 flex flex-col gap-2">
            <Slider min={arrMin} max={arrMax} value={filterState.arrTime} onValueChange={v => handleSliderChange('arrTime', v as [number, number])} step={15 * 60 * 1000} />
            <div className="text-xs text-center">{formatDateTime(new Date(filterState.arrTime[0]))} - {formatDateTime(new Date(filterState.arrTime[1]))}</div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LiveSearchFilters; 