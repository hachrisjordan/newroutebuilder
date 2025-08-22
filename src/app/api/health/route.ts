import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    // Check Supabase connection
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('Health check - Supabase error:', error);
      return NextResponse.json(
        { 
          status: 'degraded', 
          message: 'Database connection issues detected',
          timestamp: new Date().toISOString(),
          database: 'error'
        }, 
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'All systems operational',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        message: 'Server error detected',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
