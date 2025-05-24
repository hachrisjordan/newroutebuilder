import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import SeatMapTooltip from './seat-map-tooltip';

/**
 * Flight data for a single flight.
 */
export interface FlightData {
  flightNumber: string;
  date: string; // ISO date string
  registration: string;
  origin: string;
  destination: string;
  ontime: string;
}

/**
 * Props for VariantAnalysis component.
 */
export interface VariantAnalysisProps {
  flightData: FlightData[];
  seatConfigData: any; // seat config object (from API)
  airline: string;
}

/**
 * Aircraft Variant Analysis component.
 * Shows variant frequency, allows selection, and displays breakdowns by time and day of week.
 */
const VariantAnalysis: React.FC<VariantAnalysisProps> = ({ flightData, seatConfigData, airline }) => {
  // Find the most common origin/destination pair
  const pairCounts = useMemo(() => {
    const counts = new Map<string, number>();
    flightData.forEach(f => {
      const key = `${f.origin}|${f.destination}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [flightData]);
  const mostCommonPair = useMemo(() => {
    let max = 0;
    let pair = '';
    pairCounts.forEach((count, key) => {
      if (count > max) {
        max = count;
        pair = key;
      }
    });
    return pair;
  }, [pairCounts]);
  const [mostCommonOrigin, mostCommonDestination] = mostCommonPair.split('|');
  // Only use flights with the most common pair
  const scopedFlights = useMemo(() =>
    flightData.filter(f => f.origin === mostCommonOrigin && f.destination === mostCommonDestination),
    [flightData, mostCommonOrigin, mostCommonDestination]
  );

  // Helper: get variant for a registration on a date
  function getVariant(registration: string, date: string): string | null {
    if (!seatConfigData || !registration || registration === 'N/A') return null;
    const tailMap = seatConfigData.tail_number_distribution as Record<string, any>;
    let variant = tailMap[registration];
    if (variant && typeof variant === 'object' && variant.changes) {
      const sorted = [...variant.changes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const applicable = sorted.find(change => new Date(date) >= new Date(change.date));
      variant = applicable ? applicable.variant : variant.default;
    }
    if (variant && typeof variant === 'object' && variant.default) {
      variant = variant.default;
    }
    return typeof variant === 'string' ? variant : null;
  }

  // Helper: get info for a variant
  function getVariantInfo(variant: string) {
    const configsByType = seatConfigData?.configs_by_type || seatConfigData?.configurations_by_type;
    if (!configsByType) return null;
    for (const [aircraftType, configs] of Object.entries(configsByType)) {
      const found = (configs as any[]).find(cfg => cfg.variant === variant);
      if (found) {
        return { aircraftType, note: found.note, color: found.color };
      }
    }
    return null;
  }

  // Compute variant stats (scoped)
  const variantStats = useMemo(() => {
    if (!scopedFlights || !seatConfigData) return [];
    const counts = new Map<string, number>();
    const info = new Map<string, { aircraftType: string; note: string; color: string }>();
    const validFlights = scopedFlights.filter(f => f.registration && f.registration !== 'N/A');
    validFlights.forEach(f => {
      const variant = getVariant(f.registration, f.date);
      if (!variant) return;
      counts.set(variant, (counts.get(variant) || 0) + 1);
      if (!info.has(variant)) {
        const vinfo = getVariantInfo(variant);
        if (vinfo) info.set(variant, vinfo);
      }
    });
    const total = validFlights.length;
    return Array.from(counts.entries()).map(([variant, count]) => {
      const vinfo = info.get(variant) || { aircraftType: '', note: '', color: '#888' };
      return {
        variant,
        count,
        percentage: total ? (count / total) * 100 : 0,
        ...vinfo,
      };
    }).sort((a, b) => b.count - a.count);
  }, [scopedFlights, seatConfigData]);

  // Selected variant (default: most frequent)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  useEffect(() => {
    if (variantStats.length > 0 && !selectedVariant) {
      setSelectedVariant(variantStats[0].variant);
    }
  }, [variantStats, selectedVariant]);

  // Time period breakdowns (scoped)
  const timePeriods = [3, 7, 14, 28, 60, 180, 360];
  const timeLabels = ['Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 28 days', 'Last 60 days', 'Last 180 days', 'Last 360 days'];
  const timeAnalysis = useMemo(() => {
    if (!selectedVariant) return [];
    const now = new Date();
    return timePeriods.map((days, idx) => {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - days);
      const all = scopedFlights.filter(f => {
        const d = new Date(f.date);
        return d >= cutoff && d <= now && f.registration && f.registration !== 'N/A';
      });
      const count = all.filter(f => getVariant(f.registration, f.date) === selectedVariant).length;
      return {
        label: timeLabels[idx],
        percentage: all.length ? (count / all.length) * 100 : 0,
        count,
        total: all.length,
      };
    });
  }, [scopedFlights, selectedVariant]);

  // Day of week breakdown (scoped)
  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAnalysis = useMemo(() => {
    if (!selectedVariant) return [];
    const stats = Array(7).fill(0).map(() => ({ total: 0, count: 0 }));
    scopedFlights.forEach(f => {
      if (!f.registration || f.registration === 'N/A') return;
      const d = new Date(f.date);
      const dow = d.getDay();
      stats[dow].total++;
      if (getVariant(f.registration, f.date) === selectedVariant) {
        stats[dow].count++;
      }
    });
    return stats.map((s, i) => ({
      label: dayLabels[i],
      percentage: s.total ? (s.count / s.total) * 100 : 0,
      count: s.count,
      total: s.total,
    }));
  }, [scopedFlights, selectedVariant]);

  if (!variantStats.length) return null;
  const selectedColor = variantStats.find(v => v.variant === selectedVariant)?.color || '#1890ff';

  // Match calendar card width and padding for all screens >1000px (w-full xxl:w-4/5 mx-auto, p-6)
  return (
    <Card className="w-full mx-auto">
      <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-wrap">
        <CardTitle className="text-lg font-semibold w-full lg:w-auto">Aircraft Variant Analysis</CardTitle>
        {/* Aircraft variant selector: right-aligned on desktop, flexible width, single line with ellipsis */}
        <div className="w-auto min-w-0 flex-shrink flex-grow lg:justify-end lg:flex lg:items-center">
          <Select value={selectedVariant || undefined} onValueChange={setSelectedVariant}>
            <SelectTrigger className="min-w-0 w-auto max-w-full whitespace-nowrap px-2 py-1 text-sm truncate overflow-hidden">
              <SelectValue placeholder="Select variant" className="truncate" />
            </SelectTrigger>
            <SelectContent className="min-w-0 w-auto max-w-full">
              {variantStats.map(v => (
                <SelectItem key={v.variant} value={v.variant} className="w-auto max-w-full px-2 py-1">
                  <span className="inline-flex items-center gap-2 flex-nowrap truncate overflow-hidden whitespace-nowrap pr-6">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: v.color }} />
                    <span className="font-bold truncate overflow-hidden whitespace-nowrap">{v.aircraftType} ({v.variant})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-8 p-6">
        {/* Desktop/Tablet: grid view */}
        <div className="hidden lg:block">
          {/* By Time Period */}
          <div>
            <div className="font-bold mb-2">By Time Period</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {timeAnalysis.map(period => (
                <div
                  key={period.label}
                  className="relative rounded-lg border p-4 flex flex-col items-center bg-white dark:bg-zinc-900 overflow-hidden"
                  style={{ height: '100px', minHeight: 100 }}
                >
                  {/* Vertical fill background, proportional to percentage */}
                  <div
                    className="absolute left-0 bottom-0 w-full z-0"
                    style={{
                      height: `${period.percentage}%`,
                      backgroundColor: `${selectedColor}20`,
                      transition: 'height 0.3s',
                    }}
                  />
                  {/* Content above the fill */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                    <div className="text-xs mb-1 text-center">{period.label}</div>
                    <div className="font-bold text-lg text-center" style={{ color: selectedColor }}>
                      {period.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {period.count} / {period.total} flights
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* By Day of Week */}
          <div>
            <div className="font-bold mb-2">By Day of Week</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {dayAnalysis.map(day => (
                <div
                  key={day.label}
                  className="relative rounded-lg border p-4 flex flex-col items-center bg-white dark:bg-zinc-900 overflow-hidden"
                  style={{ height: '100px', minHeight: 100 }}
                >
                  {/* Vertical fill background, proportional to percentage */}
                  <div
                    className="absolute left-0 bottom-0 w-full z-0"
                    style={{
                      height: `${day.percentage}%`,
                      backgroundColor: `${selectedColor}20`,
                      transition: 'height 0.3s',
                    }}
                  />
                  {/* Content above the fill */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                    <div className="text-xs mb-1 text-center">{day.label}</div>
                    <div className="font-bold text-lg text-center" style={{ color: selectedColor }}>
                      {day.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {day.count} / {day.total} flights
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Mobile: horizontal bar view */}
        <div className="block lg:hidden">
          {/* By Time Period */}
          <div className="font-bold mb-2">By Time Period</div>
          <div className="flex flex-col gap-4">
            {timeAnalysis.map(period => (
              <div key={period.label} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span>{period.label}</span>
                  <span className="font-semibold">{period.percentage.toFixed(1)}% ({period.count}/{period.total})</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded">
                  <div
                    className="h-3 rounded"
                    style={{ width: `${period.percentage}%`, background: selectedColor, minWidth: period.percentage > 0 ? '0.5rem' : 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* By Day of Week */}
          <div className="font-bold mt-8 mb-2">By Day of Week</div>
          <div className="flex flex-col gap-4">
            {dayAnalysis.map(day => (
              <div key={day.label} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span>{day.label}</span>
                  <span className="font-semibold">{day.percentage.toFixed(1)}% ({day.count}/{day.total})</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded">
                  <div
                    className="h-3 rounded"
                    style={{ width: `${day.percentage}%`, background: selectedColor, minWidth: day.percentage > 0 ? '0.5rem' : 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VariantAnalysis; 