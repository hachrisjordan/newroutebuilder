// Airline alliance mapping and helpers
export const ALLIANCE_MAP: Record<string, 'SA' | 'OW' | 'ST' | undefined> = {
  // Star Alliance
  A3: 'SA', AC: 'SA', CA: 'SA', AI: 'SA', NZ: 'SA', NH: 'SA', OZ: 'SA', OS: 'SA', AV: 'SA', SN: 'SA', CM: 'SA', OU: 'SA', MS: 'SA', ET: 'SA', BR: 'SA', LO: 'SA', LH: 'SA', CL: 'SA', ZH: 'SA', SQ: 'SA', SA: 'SA', LX: 'SA', TP: 'SA', TG: 'SA', TK: 'SA', UA: 'SA',
  // Oneworld
  AS: 'OW', AA: 'OW', BA: 'OW', CX: 'OW', FJ: 'OW', AY: 'OW', IB: 'OW', JL: 'OW', QF: 'OW', QR: 'OW', RJ: 'OW', AT: 'OW', UL: 'OW',
  // SkyTeam
  AR: 'ST', AM: 'ST', UX: 'ST', AF: 'ST', CI: 'ST', MU: 'ST', DL: 'ST', GA: 'ST', KQ: 'ST', ME: 'ST', KL: 'ST', KE: 'ST', SV: 'ST', SK: 'ST', RO: 'ST', VN: 'ST', VS: 'ST', MF: 'ST',
};

export function getAirlineAlliance(airline: string): 'SA' | 'OW' | 'ST' | undefined {
  return ALLIANCE_MAP[airline];
}

export function isStarAllianceAirline(airline: string): boolean {
  return getAirlineAlliance(airline) === 'SA';
}

// Helper to fetch program details from Supabase airlines table
import { createSupabaseBrowserClient } from './supabase-browser';

export async function getProgramDetailsFromDb(code: string): Promise<{ code: string; name: string; ffp?: string } | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('airlines')
    .select('code, name, ffp')
    .eq('code', code)
    .single();
  if (error || !data) return null;
  return { code: data.code, name: data.name, ffp: data.ffp };
}

// Helper to fetch all available programs from Supabase airlines table
export async function getAllProgramsFromDb(): Promise<Array<{ code: string; name: string; ffp: string; alliance: 'SA' | 'OW' | 'ST' }>> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('airlines')
    .select('code, name, ffp, alliance')
    .not('ffp', 'is', null)
    .in('alliance', ['SA', 'OW', 'ST']);
  if (error || !data) return [];
  return data as Array<{ code: string; name: string; ffp: string; alliance: 'SA' | 'OW' | 'ST' }>;
}

export const STAR_ALLIANCE = Object.keys(ALLIANCE_MAP).filter(code => ALLIANCE_MAP[code] === 'SA'); 