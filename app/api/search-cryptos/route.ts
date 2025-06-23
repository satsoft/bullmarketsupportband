import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Fetching top 100 cryptocurrencies for search...');
    
    // Get top 100 active cryptocurrencies
    const { data: cryptocurrencies, error } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id, symbol, name, current_rank')
      .eq('is_active', true)
      .order('current_rank', { ascending: true })
      .limit(100);

    if (error) {
      throw error;
    }

    console.log(`✅ Retrieved ${cryptocurrencies?.length || 0} cryptocurrencies for search`);

    return NextResponse.json({
      success: true,
      data: cryptocurrencies || [],
      count: cryptocurrencies?.length || 0
    });

  } catch (error) {
    console.error('❌ Error fetching cryptocurrencies for search:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        count: 0
      },
      { status: 500 }
    );
  }
}