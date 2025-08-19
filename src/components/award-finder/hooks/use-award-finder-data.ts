import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export interface IataToCity {
  [key: string]: string;
}

export interface AllianceData {
  [key: string]: Array<{code: string, name: string, ffp: string}>;
}

export interface AirlineData {
  code: string;
  name: string;
  alliance: string;
  ffp: string;
  bonus: string[];
  recommend: string[];
}

export function useAwardFinderData(cards: Array<{ route: string; date: string; itinerary: string[] }>) {
  const [iataToCity, setIataToCity] = useState<IataToCity>({});
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [allianceData, setAllianceData] = useState<AllianceData>({});
  const [allAirlines, setAllAirlines] = useState<AirlineData[]>([]);

  // Collect all unique IATA codes from all cards
  useEffect(() => {
    const allIatas = new Set<string>();
    cards.forEach(({ route }) => {
      const segs = route.split('-');
      segs.forEach(iata => { if (iata) allIatas.add(iata); });
    });
    if (allIatas.size === 0) {
      setIataToCity({});
      return;
    }
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCityError(null);
      try {
        const supabase = createSupabaseBrowserClient();
        const iataList = Array.from(allIatas);
        const { data, error } = await supabase
          .from('airports')
          .select('iata, city_name')
          .in('iata', iataList);
        if (error) throw error;
        const map: IataToCity = {};
        data?.forEach((row: { iata: string; city_name: string }) => {
          map[row.iata] = row.city_name;
        });
        setIataToCity(map);
      } catch (err: any) {
        setCityError(err.message || 'Failed to load city names');
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, [cards]);

  // Fetch all airline data for tooltips
  useEffect(() => {
    const fetchAirlineData = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('airlines')
          .select('code, name, alliance, ffp, bonus, recommend');
        
        if (error) throw error;
        
        const allianceMap: AllianceData = {};
        const airlines: AirlineData[] = [];
        
        data?.forEach((row: AirlineData) => {
          // For alliance data (only airlines with FFP)
          if (row.alliance && ['OW', 'SA', 'ST'].includes(row.alliance) && row.ffp) {
            if (!allianceMap[row.alliance]) {
              allianceMap[row.alliance] = [];
            }
            allianceMap[row.alliance].push({
              code: row.code,
              name: row.name,
              ffp: row.ffp
            });
          }
          
          // For all airlines (including those without FFP for bonus checking)
          airlines.push({
            code: row.code,
            name: row.name,
            ffp: row.ffp,
            bonus: row.bonus || [],
            recommend: row.recommend || []
          });
        });
        
        setAllianceData(allianceMap);
        setAllAirlines(airlines);
      } catch (err: any) {
        console.error('Failed to fetch airline data:', err);
      }
    };
    
    fetchAirlineData();
  }, []);

  return {
    iataToCity,
    isLoadingCities,
    cityError,
    allianceData,
    allAirlines
  };
}