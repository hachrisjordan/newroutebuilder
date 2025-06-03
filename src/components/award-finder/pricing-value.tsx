import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getHaversineDistance } from '@/lib/route-helpers';
import SelectProgram from './select-program';

/**
 * Props for PricingValue component.
 * @property flight - Flight object
 * @property depIata - Departure IATA code
 * @property arrIata - Arrival IATA code
 * @property airline - Airline code
 * @property distance - Optional distance
 * @property program - Program code
 * @property className - Optional className
 * @property classAvailability - Object with Y, W, J, F boolean values for available classes
 */
export interface PricingValueProps {
  flight: any;
  depIata: string;
  arrIata: string;
  airline: string;
  distance?: number;
  program?: string;
  className?: string;
  classAvailability?: Record<'Y' | 'W' | 'J' | 'F', boolean>;
}

const CLASS_LABELS = [
  { key: 'economy', label: 'Y' },
  { key: 'premium', label: 'W' },
  { key: 'business', label: 'J' },
  { key: 'first', label: 'F' },
];

// Add classBarColors mapping for badge backgrounds
const classBarColors: Record<string, string> = {
  Y: '#E8E1F2',
  W: '#B8A4CC',
  J: '#F3CD87',
  F: '#D88A3F',
};

// Helper to determine if a color is light or dark
function getContrastTextColor(bgColor: string): string {
  // Remove # if present
  const hex = bgColor.replace('#', '');
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.6 ? '#222' : '#fff';
}

// Star Alliance airline codes
const STAR_ALLIANCE = [
  'A3','AC','CA','AI','NZ','NH','OZ','OS','AV','SN','CM','OU','MS','ET','BR','LO','LH','CL','ZH','SQ','SA','LX','TP','TG','TK','UA'
];

/**
 * Renders pricing values for available classes, aligned with SelectProgram.
 */
const PricingValue: React.FC<PricingValueProps> = ({
  flight,
  depIata,
  arrIata,
  airline,
  distance,
  program = 'AC',
  className = '',
  classAvailability = { Y: true, W: true, J: true, F: true },
}) => {
  // Only enable pricing for Star Alliance airlines
  if (!STAR_ALLIANCE.includes(airline)) return null;

  const [regions, setRegions] = useState<{ dep: string | null; arr: string | null }>({ dep: null, arr: null });
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [computedDistance, setComputedDistance] = useState<number | null>(null);
  const [selectedProgram, setSelectedProgramState] = useState<string>('AC');

  const setSelectedProgram = (code: string | undefined) => {
    setSelectedProgramState(code ?? 'AC');
  };

  useEffect(() => {
    if (selectedProgram !== 'AC') return;
    const fetchRegionsAndPricing = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createSupabaseBrowserClient();
        // 1. Get dep/arr country_code and lat/lon
        const { data: airports, error: airportErr } = await supabase
          .from('airports')
          .select('iata, country_code, latitude, longitude')
          .in('iata', [depIata, arrIata]);
        if (airportErr) throw airportErr;
        const dep = airports?.find((a: any) => a.iata === depIata);
        const arr = airports?.find((a: any) => a.iata === arrIata);
        if (!dep || !arr) throw new Error('Missing airport data');
        const depCountry = dep.country_code;
        const arrCountry = arr.country_code;
        // 2. Get dep/arr region
        const regionTable = program.toLowerCase();
        const { data: acs, error: acErr } = await supabase
          .from(regionTable)
          .select('country_code, region')
          .in('country_code', [depCountry, arrCountry]);
        if (acErr) throw acErr;
        const depRegion = acs?.find((a: any) => a.country_code === depCountry)?.region;
        const arrRegion = acs?.find((a: any) => a.country_code === arrCountry)?.region;
        if (!depRegion || !arrRegion) throw new Error('Missing region');
        setRegions({ dep: depRegion, arr: arrRegion });
        // 3. Calculate distance if not provided
        let dist = distance;
        if (dist === undefined) {
          if (typeof dep.latitude === 'number' && typeof dep.longitude === 'number' && typeof arr.latitude === 'number' && typeof arr.longitude === 'number') {
            dist = getHaversineDistance(dep.latitude, dep.longitude, arr.latitude, arr.longitude);
            setComputedDistance(dist);
          } else {
            throw new Error('Missing lat/lon for distance calculation');
          }
        }
        // 4. Query <program>_pricing (region+distance rules first)
        const pricingTable = `${program.toLowerCase()}_pricing`;
        let { data: pricings, error: pricingErr } = await supabase
          .from(pricingTable)
          .select('*')
          .overlaps('airlines', [airline])
          .eq('dep_region', depRegion.trim())
          .eq('arr_region', arrRegion.trim())
          .lte('min_dist', dist)
          .gte('max_dist', dist)
          .order('priority', { ascending: true });
        if (pricingErr) throw pricingErr;
        // 5. If no match, try distance-only rules (type_single: 'dist', dep_region/arr_region: null)
        if (!pricings || pricings.length === 0) {
          const { data: distPricings, error: distErr } = await supabase
            .from(pricingTable)
            .select('*')
            .overlaps('airlines', [airline])
            .is('dep_region', null)
            .is('arr_region', null)
            .eq('type_single', 'dist')
            .lte('min_dist', dist)
            .gte('max_dist', dist)
            .order('priority', { ascending: true });
          if (distErr) throw distErr;
          pricings = distPricings;
        }
        setPricing(pricings && pricings.length > 0 ? pricings[0] : null);
        console.log('Pricing row:', pricings && pricings.length > 0 ? pricings[0] : null);
      } catch (err: any) {
        console.error('[PricingValue] error:', err);
        setError(err.message || 'Failed to load pricing');
      } finally {
        setLoading(false);
      }
    };
    fetchRegionsAndPricing();
  }, [depIata, arrIata, airline, distance, selectedProgram]);

  if (selectedProgram !== 'AC') return null;
  if (loading) return <div className={className}>Loading pricing…</div>;
  if (error) return <div className={className + ' text-red-500'}>Pricing error: {error}</div>;
  if (!pricing) return <div className={className}>N/A</div>;

  // Prepare badge data
  const badges = CLASS_LABELS.filter(({ label }) => classAvailability[label as keyof typeof classAvailability])
    .map(({ key, label }) => {
      const value = pricing[key];
      // Support per-class dynamic_in/dynamic_out (object) or global (boolean)
      const isDynamicIn = typeof pricing.dynamic_in === 'object' ? pricing.dynamic_in[label] : pricing.dynamic_in;
      const isDynamicOut = typeof pricing.dynamic_out === 'object' ? pricing.dynamic_out[label] : pricing.dynamic_out;
      let display: React.ReactNode;
      if (isDynamicOut) {
        display = 'Dynamic';
      } else if (value != null) {
        display = value.toLocaleString();
      } else {
        display = 'N/A';
      }
      if (display === 'N/A') return null;
      console.log('Pricing used for badges:', pricing);
      return (
        <div key={key} className="flex items-center gap-1 text-sm">
          <span className="font-bold">{label}</span>
          <span
            className="rounded px-2 py-0.5 font-mono font-bold text-sm"
            style={{
              background: classBarColors[label] || undefined,
              color: getContrastTextColor(classBarColors[label] || '#E8E1F2'),
            }}
          >
            {display}
          </span>
        </div>
      );
    })
    .filter(Boolean);

  return (
    <div className={className + ' flex flex-row items-center justify-between w-full gap-2'}>
      <div className="w-fit min-w-0">
        <SelectProgram selectedProgram={selectedProgram} setSelectedProgram={setSelectedProgram} />
      </div>
      <div className="flex flex-row flex-wrap min-w-0 gap-2 items-center justify-end">
        {badges.length > 0 ? badges : <span className="text-muted-foreground text-sm">N/A</span>}
      </div>
    </div>
  );
};

export default PricingValue; 