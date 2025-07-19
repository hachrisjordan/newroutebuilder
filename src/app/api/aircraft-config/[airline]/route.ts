import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { airline: string } }
) {
  try {
    const { airline } = params;

    if (!airline) {
      return NextResponse.json({ error: 'Airline parameter is required' }, { status: 400 });
    }

    // Fetch tail number distribution with effective dates
    const { data: tailData, error: tailError } = await supabase
      .from('tail')
      .select('*')
      .eq('airline', airline)
      .order('tail', { ascending: true })
      .order('effective_date', { ascending: true });

    if (tailError) {
      console.error('Error fetching tail data:', tailError);
      return NextResponse.json({ error: 'Failed to fetch tail data' }, { status: 500 });
    }

    // Fetch configuration data
    const { data: configData, error: configError } = await supabase
      .from('config')
      .select('*')
      .eq('airline', airline);

    if (configError) {
      console.error('Error fetching config data:', configError);
      return NextResponse.json({ error: 'Failed to fetch config data' }, { status: 500 });
    }

    // Process tail data to create the distribution structure
    const tailDistribution: Record<string, any> = {};
    
    tailData?.forEach(record => {
      const tail = record.tail;
      if (!tail) return;

      if (!tailDistribution[tail]) {
        tailDistribution[tail] = {
          default: record.type,
          changes: []
        };
      }

      // If there's an effective date, it's a change
      if (record.effective_date && record.effective_date !== '') {
        tailDistribution[tail].changes.push({
          date: record.effective_date,
          variant: record.type
        });
      } else if (record.end_date && record.end_date !== '') {
        // This is the "before" configuration
        tailDistribution[tail].default = record.type;
      }
    });

    // Process config data to create the configurations_by_type structure
    const configurationsByType: Record<string, any[]> = {};
    
    configData?.forEach(record => {
      const type = record.type;
      if (!type) return;

      if (!configurationsByType[type]) {
        configurationsByType[type] = [];
      }

      configurationsByType[type].push({
        variant: record.variant,
        config: record.config,
        note: record.note,
        color: record.color
      });
    });

    // Return the data in the expected format
    const response = {
      tail_number_distribution: tailDistribution,
      configurations_by_type: configurationsByType
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in aircraft config API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 