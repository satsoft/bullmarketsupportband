import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    // Update PI Network to not be a stablecoin
    const { data, error } = await supabaseAdmin
      .from('cryptocurrencies')
      .update({ is_stablecoin: false })
      .eq('symbol', 'PI')
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'PI Network updated successfully',
      data
    });
  } catch (error) {
    console.error('Error updating PI Network:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update PI Network'
    }, { status: 500 });
  }
}