import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getHaversineDistance } from '@/lib/route-helpers';
import SelectProgram from './select-program';
import { getAirlineAlliance, isStarAllianceAirline, getAllProgramsFromDb } from '@/lib/alliance';

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
 * @property classReliability - Object with Y, W, J, F boolean values for class reliability
 * @property pricingPromise - Optional: shared/cached pricing fetch
 * @property userProfile - Optional: user profile
 * @property allPrograms - Optional: all programs
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
  classReliability: Record<'Y' | 'W' | 'J' | 'F', boolean>;
  pricingPromise?: Promise<any>;
  userProfile?: { sa?: string; ow?: string; st?: string } | null;
  allPrograms?: Array<{ code: string; name: string; ffp: string; alliance: 'SA' | 'OW' | 'ST' }>;
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

/**
 * Renders pricing values for available classes, aligned with SelectProgram.
 */
const PricingValue: React.FC<PricingValueProps> = ({
  flight,
  depIata,
  arrIata,
  airline,
  distance,
  program,
  className = '',
  classAvailability = { Y: true, W: true, J: true, F: true },
  classReliability,
  pricingPromise,
  userProfile,
  allPrograms,
}) => {
  if (!classReliability) {
    throw new Error('classReliability prop is required for PricingValue');
  }
  // All hooks must be at the top, before any early return
  const [allowedPrograms, setAllowedPrograms] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgramState] = useState<string>('');
  const [regions, setRegions] = useState<{ dep: string | null; arr: string | null }>({ dep: null, arr: null });
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [computedDistance, setComputedDistance] = useState<number | null>(null);
  const [showNAFlash, setShowNAFlash] = useState(false);
  const [userProfileState, setUserProfile] = useState<{ sa?: string; ow?: string; st?: string } | null>(userProfile ?? null);
  const [allProgramsState, setAllPrograms] = useState<Array<{ code: string; name: string; ffp: string; alliance: 'SA' | 'OW' | 'ST' }>>(allPrograms ?? []);
  const [triedPrograms, setTriedPrograms] = useState<string[]>([]);

  // Only fetch user profile if not provided
  useEffect(() => {
    if (userProfile !== undefined) {
      setUserProfile(userProfile);
      return;
    }
    async function fetchUserProfile() {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setUserProfile(null);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('sa, ow, st')
        .eq('id', userData.user.id)
        .single();
      if (profileError || !profile) {
        setUserProfile(null);
      } else {
        setUserProfile(profile);
      }
    }
    fetchUserProfile();
  }, [userProfile]);

  // Only fetch all programs if not provided
  useEffect(() => {
    if (allPrograms !== undefined) {
      setAllPrograms(allPrograms);
      return;
    }
    async function fetchPrograms() {
      const alliance = getAirlineAlliance(airline);
      if (!alliance) {
        setAllowedPrograms([]);
        setSelectedProgramState('');
        return;
      }
      const allProgramsDb = await getAllProgramsFromDb();
      setAllPrograms(allProgramsDb);
    }
    fetchPrograms();
  }, [airline, allPrograms]);

  useEffect(() => {
    async function updateAllowedPrograms() {
      const alliance = getAirlineAlliance(airline);
      if (!alliance) {
        setAllowedPrograms([]);
        setSelectedProgramState('');
        return;
      }
      const allProgs = allPrograms !== undefined ? allPrograms : allProgramsState;
      let defaultProgram = '';
      if (userProfile !== undefined ? userProfile : userProfileState) {
        const up = userProfile !== undefined ? userProfile : userProfileState;
        if (alliance === 'SA' && up?.sa) defaultProgram = up.sa;
        if (alliance === 'OW' && up?.ow) defaultProgram = up.ow;
        if (alliance === 'ST' && up?.st) defaultProgram = up.st;
      }
      const filtered = allProgs.filter(p => p.alliance === alliance).map(p => p.code);
      setAllowedPrograms(filtered);
      setSelectedProgramState(filtered.includes(defaultProgram) ? defaultProgram : filtered[0] || '');
    }
    updateAllowedPrograms();
  }, [airline, userProfile, userProfileState, allPrograms, allProgramsState]);

  useEffect(() => {
    setTriedPrograms([]); // Reset tried programs when allowedPrograms or airline changes
  }, [allowedPrograms, airline]);

  // If pricingPromise is provided, use it for pricing data
  useEffect(() => {
    let cancelled = false;
    if (pricingPromise) {
      setLoading(true);
      setError(null);
      pricingPromise
        .then((data) => {
          if (!cancelled) {
            setPricing(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err?.message || 'Failed to load pricing');
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }
  }, [pricingPromise]);

  // Only run the original fetch logic if pricingPromise is not provided
  useEffect(() => {
    if (pricingPromise) return; // skip if using shared promise
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
        let depRegion: string | null = null;
        let arrRegion: string | null = null;
        if (selectedProgram) {
          const regionTable = selectedProgram.toLowerCase();
          let acs, acErr;
          try {
            const result = await supabase
              .from(regionTable)
              .select('country_code, region')
              .in('country_code', [depCountry, arrCountry]);
            acs = result.data;
            acErr = result.error;
          } catch (e: any) {
            acErr = e;
          }
          // If error is missing column, treat as null
          if (acErr && String(acErr.message || acErr).includes('does not exist')) {
            depRegion = null;
            arrRegion = null;
          } else {
            if (acErr) throw acErr;
            depRegion = acs?.find((a: any) => a.country_code === depCountry)?.region ?? null;
            arrRegion = acs?.find((a: any) => a.country_code === arrCountry)?.region ?? null;
          }
        }
        // No fallback to profiles for region lookup
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
        // 4. Query all pricing rules for this airline, ordered by priority
        if (!selectedProgram || !allowedPrograms.includes(selectedProgram)) return null;
        const pricingTable = `${selectedProgram.toLowerCase()}_pricing`;
        let { data: allRules, error: pricingErr } = await supabase
          .from(pricingTable)
          .select('*')
          .overlaps('airlines', [airline])
          .order('priority', { ascending: true });
        if (pricingErr) throw pricingErr;
        let matchedRules = [];
        if (allRules && allRules.length > 0) {
          for (const rule of allRules) {
            if (rule.type_single === 'dist-region') {
              if (
                rule.dep_region && rule.arr_region &&
                depRegion && arrRegion &&
                rule.dep_region.trim() === depRegion.trim() &&
                rule.arr_region.trim() === arrRegion.trim() &&
                dist >= rule.min_dist && dist <= rule.max_dist
              ) {
                matchedRules.push(rule);
              }
            } else if (rule.type_single === 'region') {
              if (
                rule.dep_region && rule.arr_region &&
                depRegion && arrRegion &&
                rule.dep_region.trim() === depRegion.trim() &&
                rule.arr_region.trim() === arrRegion.trim()
              ) {
                matchedRules.push(rule);
              }
            } else if (rule.type_single === 'dist') {
              if (
                dist >= rule.min_dist && dist <= rule.max_dist
              ) {
                matchedRules.push(rule);
              }
            }
          }
        }
        if (!matchedRules.length) {
          throw new Error('No matching pricing rule');
        }
        // Store all matched rules for per-class selection
        setPricing({ ...matchedRules[0], allRules: matchedRules });
      } catch (err: any) {
        console.error('[PricingValue] error:', err);
        const errMsg = err.message || 'Failed to load pricing';
        if (
          errMsg === 'No matching pricing rule' &&
          allowedPrograms.length > 0 &&
          selectedProgram &&
          !triedPrograms.includes(selectedProgram)
        ) {
          // Try next eligible program
          const currentIdx = allowedPrograms.indexOf(selectedProgram);
          const nextIdx = currentIdx + 1;
          setTriedPrograms(prev => [...prev, selectedProgram]);
          if (nextIdx < allowedPrograms.length) {
            setSelectedProgramState(allowedPrograms[nextIdx]);
            return; // Don't set error yet, let next program try
          } else {
            setError('No eligible program found');
            return;
          }
        }
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchRegionsAndPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depIata, arrIata, airline, distance, selectedProgram, triedPrograms]);

  useEffect(() => {
    if (!loading && !error && !pricing) {
      setShowNAFlash(true);
      const timeout = setTimeout(() => setShowNAFlash(false), 1000);
      return () => clearTimeout(timeout);
    } else {
      setShowNAFlash(false);
    }
  }, [loading, error, pricing]);

  // Only after all hooks and effects:
  if (!allowedPrograms.includes(selectedProgram)) return null;

  if (loading) {
    return (
      <div className={className + ' animate-pulse text-muted-foreground'}>
        <span className="inline-block w-24 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
        <span className="ml-2">Loading pricing…</span>
      </div>
    );
  }
  if (error === 'No eligible program found') {
    return <div className={className + ' text-red-500'}>No eligible program found</div>;
  }
  if (error) return <div className={className + ' text-red-500'}>Pricing error: {error}</div>;
  if (showNAFlash) return <div className={className + ' animate-pulse text-muted-foreground'}>N/A</div>;
  if (!pricing) return <div className={className}>N/A</div>;

  // Prepare badge data
  const badges = CLASS_LABELS.filter(({ label }) => classAvailability[label as keyof typeof classAvailability])
    .map(({ key, label }) => {
      // Use only the classReliability prop to determine reliability
      const isReliable = classReliability[label as keyof typeof classReliability];
      // Find the matching rule for this class
      let matchedRule = null;
      if (pricing && Array.isArray(pricing.allRules)) {
        for (const rule of pricing.allRules) {
          if (isReliable && rule.dynamic_in === false) {
            matchedRule = rule;
            break;
          }
          if (!isReliable && rule.dynamic_in === true) {
            matchedRule = rule;
            break;
          }
        }
        // If class is unreliable and no rule with dynamic_in: true for this airline, show N/A
        if (!matchedRule && !isReliable) {
          const hasDynamicInRule = pricing.allRules.some((rule: any) => rule.dynamic_in === true);
          if (!hasDynamicInRule) {
            return (
              <div key={key} className="flex items-center gap-1 text-sm">
                <span className="font-bold">{label}</span>
                <span className="rounded px-2 py-0.5 font-mono font-bold text-sm bg-muted text-muted-foreground">N/A</span>
              </div>
            );
          }
        }
      } else if (isReliable) {
        matchedRule = pricing;
      }
      let display: React.ReactNode = 'N/A';
      if (matchedRule) {
        const isDynamicOut = typeof matchedRule.dynamic_out === 'object' ? matchedRule.dynamic_out[label] : matchedRule.dynamic_out;
        const classValue = matchedRule[key];
        if (isDynamicOut) {
          display = 'Dynamic';
        } else if (classValue != null && classValue !== 0) {
          display = classValue.toLocaleString();
        }
      }
      // Always render the badge, even if display is 'N/A'
      return (
        <div key={key} className="flex items-center gap-1 text-sm">
          <span className="font-bold">{label}</span>
          <span
            className={
              display === 'N/A'
                ? 'rounded px-2 py-0.5 font-mono font-bold text-sm bg-muted text-muted-foreground'
                : 'rounded px-2 py-0.5 font-mono font-bold text-sm'
            }
            style={
              display === 'N/A'
                ? undefined
                : {
                    background: classBarColors[label] || undefined,
                    color: getContrastTextColor(classBarColors[label] || '#E8E1F2'),
                  }
            }
          >
            {display}
          </span>
        </div>
      );
    });

  return (
    <div className={className + ' flex flex-row items-center justify-between w-full gap-2'}>
      <div className="w-fit min-w-0">
        <SelectProgram
          airline={airline}
          selectedProgram={selectedProgram}
          setSelectedProgram={(code: string | undefined) => setSelectedProgramState(code ?? '')}
        />
      </div>
      <div className="flex flex-row flex-wrap min-w-0 gap-2 items-center justify-end">
        {badges.length > 0 ? badges : <span className="text-muted-foreground text-sm">N/A</span>}
      </div>
    </div>
  );
};

export default PricingValue; 