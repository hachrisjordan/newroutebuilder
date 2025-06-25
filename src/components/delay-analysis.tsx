import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface DelayAnalysisProps {
  flightData: Array<{
    date: string;
    ontime: string;
    origin: string;
    destination: string;
  }>;
}

// Helper: get delay color
function getDelayColor(delay: number, canceledPercentage = 0) {
  if (canceledPercentage >= 50) return '#000000'; // Black for majority canceled
  if (delay <= 0) return '#4caf50'; // Green
  if (delay >= 120) return '#f44336'; // Red
  if (delay <= 30) {
    // Green to Yellow
    const r = Math.round(76 + (255 - 76) * (delay / 30));
    const g = Math.round(175 + (193 - 175) * (delay / 30));
    const b = Math.round(80 + (7 - 80) * (delay / 30));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to Red
    const r = Math.round(255 + (244 - 255) * ((delay - 30) / 90));
    const g = Math.round(193 + (67 - 193) * ((delay - 30) / 90));
    const b = Math.round(7 + (54 - 7) * ((delay - 30) / 90));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// Helper: get delay category
function getDelayCategory(delay: string) {
  if (delay === 'CANCELED') return 'Canceled';
  if (delay.startsWith('Diverted to')) return 'Diverted';
  const num = parseInt(delay);
  if (isNaN(num)) return 'Other';
  if (num <= 0) return 'On Time';
  if (num <= 15) return '0-15 min';
  if (num <= 30) return '15-30 min';
  if (num <= 60) return '30-60 min';
  if (num <= 120) return '1-2 hours';
  return '2+ hours';
}

const timePeriods = [3, 7, 14, 28, 60, 180, 360];
const timeLabels = ['Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 28 days', 'Last 60 days', 'Last 180 days', 'Last 360 days'];

const DelayAnalysis: React.FC<DelayAnalysisProps> = ({ flightData }) => {
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
  // Guard: always split a string
  const [mostCommonOrigin, mostCommonDestination] = (mostCommonPair || '').split('|');
  // Only use flights with the most common pair
  const scopedFlights = useMemo(() =>
    flightData.filter(f => f.origin === mostCommonOrigin && f.destination === mostCommonDestination),
    [flightData, mostCommonOrigin, mostCommonDestination]
  );

  const delayStats = useMemo(() => {
    if (!scopedFlights) return [];
    const now = new Date();
    return timePeriods.map((days, idx) => {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - days);
      const flights = scopedFlights.filter(item => {
        const d = new Date(item.date);
        return d >= cutoff && d <= now && item.ontime !== 'N/A';
      });
      const total = flights.length;
      if (total === 0) return null;
      const onTime = flights.filter(f => parseInt(f.ontime) <= 0).length;
      const onTimePct = (onTime / total) * 100;
      const totalDelay = flights.reduce((sum, f) => {
        const d = parseInt(f.ontime);
        return isNaN(d) ? sum : sum + d;
      }, 0);
      const avgDelay = totalDelay / total;
      const delayDist: Record<string, number> = {
        'Canceled': 0,
        'Diverted': 0,
        'On Time': 0,
        '0-15 min': 0,
        '15-30 min': 0,
        '30-60 min': 0,
        '1-2 hours': 0,
        '2+ hours': 0,
        'Other': 0,
      };
      flights.forEach(f => {
        const cat = getDelayCategory(f.ontime);
        delayDist[cat] = (delayDist[cat] || 0) + 1;
      });
      const canceledPct = (delayDist['Canceled'] / total) * 100;
      let formattedDelay: string;
      if (avgDelay >= 60) {
        const h = Math.floor(avgDelay / 60);
        const m = Math.round(avgDelay % 60);
        formattedDelay = m > 0 ? `${h}h${m}m` : `${h}h`;
      } else {
        formattedDelay = `${Math.round(avgDelay)}m`;
      }
      return {
        label: timeLabels[idx],
        onTimePct,
        avgDelay: formattedDelay,
        rawAvgDelay: avgDelay,
        total,
        onTime,
        delayDist,
        canceledPct,
      };
    }).filter(Boolean);
  }, [scopedFlights]);

  if (!delayStats || delayStats.length === 0) return null;

  // Filter out null periods for rendering
  const validStats = delayStats.filter(Boolean) as NonNullable<typeof delayStats[number]>[];

  return (
    <Card className="w-full mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Delay Analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-8 p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 hidden lg:grid">
          {validStats.map(period => {
            const color = getDelayColor(period.rawAvgDelay, period.canceledPct);
            return (
              <div key={period.label} className="flex flex-col gap-2">
                <div
                  className="relative rounded-lg border p-4 flex flex-col items-center bg-white dark:bg-zinc-900 overflow-hidden"
                  style={{ height: '100px', minHeight: 100 }}
                >
                  <div
                    className="absolute left-0 bottom-0 w-full z-0"
                    style={{ height: `${period.onTimePct}%`, backgroundColor: '#4caf5020', transition: 'height 0.3s' }}
                  />
                  <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                    <div className="text-xs mb-1 text-center">{period.label}</div>
                    <div className="font-bold text-lg text-center" style={{ color }}>
                      {period.avgDelay} ({period.onTimePct.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                {/* Delay Distribution Bar Chart */}
                <div className="p-2 bg-white dark:bg-zinc-900 border rounded-lg text-[10px]">
                  {Object.entries(period.delayDist)
                    .sort(([a], [b]) => {
                      const order: Record<string, number> = {
                        'On Time': 0,
                        '0-15 min': 1,
                        '15-30 min': 2,
                        '30-60 min': 3,
                        '1-2 hours': 4,
                        '2+ hours': 5,
                        'Diverted': 6,
                        'Canceled': 7,
                        'Other': 8,
                      };
                      return (order[a] || 0) - (order[b] || 0);
                    })
                    .map(([cat, count]) => {
                      const pct = (count / period.total) * 100;
                      let catColor = '#9e9e9e';
                      switch (cat) {
                        case 'Canceled': catColor = '#000000'; break;
                        case 'Diverted': catColor = '#9c27b0'; break;
                        case 'On Time': catColor = '#4caf50'; break;
                        case '0-15 min': catColor = '#8bc34a'; break;
                        case '15-30 min': catColor = '#ffc107'; break;
                        case '30-60 min': catColor = '#ff9800'; break;
                        case '1-2 hours': catColor = '#ff5722'; break;
                        case '2+ hours': catColor = '#f44336'; break;
                        default: break;
                      }
                      return (
                        <div key={cat} className="mb-1 last:mb-0">
                          <div className="flex justify-between mb-0.5">
                            <span>{cat}</span>
                            <span>{count} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded">
                            <div
                              className="h-1.5 rounded"
                              style={{ width: `${pct}%`, background: catColor, minWidth: pct > 0 ? '0.5rem' : 0 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
        {/* Mobile: horizontal bar view */}
        <div className="block lg:hidden">
          <div className="flex flex-col gap-4">
            {validStats.map((period, idx) => {
              // Prepare ordered categories and colors
              const categories = [
                'On Time',
                '0-15 min',
                '15-30 min',
                '30-60 min',
                '1-2 hours',
                '2+ hours',
                'Diverted',
                'Canceled',
                'Other',
              ];
              const colorMap: Record<string, string> = {
                'On Time': '#4caf50',
                '0-15 min': '#8bc34a',
                '15-30 min': '#ffc107',
                '30-60 min': '#ff9800',
                '1-2 hours': '#ff5722',
                '2+ hours': '#f44336',
                'Diverted': '#9c27b0',
                'Canceled': '#000000',
                'Other': '#9e9e9e',
              };
              const total = period.total;
              const [open, setOpen] = useState(false);
              return (
                <div key={period.label} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{period.label}</span>
                    <span className="font-semibold">{period.avgDelay} ({period.onTimePct.toFixed(1)}%, {period.onTime}/{period.total})</span>
                  </div>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip open={open} onOpenChange={setOpen}>
                      <TooltipTrigger asChild>
                        <div
                          className="w-full h-3 bg-gray-200 rounded flex overflow-hidden cursor-pointer"
                          onClick={e => {
                            e.stopPropagation();
                            setOpen(v => !v);
                          }}
                          onTouchEnd={e => {
                            e.stopPropagation();
                            setOpen(v => !v);
                          }}
                        >
                          {categories.map(cat => {
                            const count = period.delayDist[cat] || 0;
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            if (pct === 0) return null;
                            return (
                              <div
                                key={cat}
                                style={{ width: `${pct}%`, background: colorMap[cat], minWidth: pct > 0 ? '0.5rem' : 0 }}
                                className="h-3"
                              />
                            );
                          })}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="p-2 bg-white dark:bg-zinc-900 border rounded-lg text-[10px] min-w-[320px] max-w-[400px]">
                        <div className="flex flex-col gap-1">
                          {categories.map(cat => {
                            const count = period.delayDist[cat] || 0;
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            let catColor = colorMap[cat];
                            return (
                              <div key={cat} className="mb-1 last:mb-0">
                                <div className="flex justify-between mb-0.5">
                                  <span>{cat}</span>
                                  <span>{count} ({pct.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-200 rounded">
                                  <div
                                    className="h-1.5 rounded"
                                    style={{ width: `${pct}%`, background: catColor, minWidth: pct > 0 ? '0.5rem' : 0 }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DelayAnalysis; 