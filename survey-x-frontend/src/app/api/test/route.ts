import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Test Supabase connection directly
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE or SUPABASE_ANON_KEY environment variables.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const sb = getSupabase();
    console.log('Supabase client created successfully');

    // Test connection by trying to select from surveys table
    const { data, error } = await sb
      .from('surveys')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      return Response.json({
        success: false,
        error: 'Supabase query failed',
        details: error.message
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'Supabase connection successful',
      data
    });
  } catch (error) {
    console.error('Supabase connection error:', error);
    return Response.json({
      success: false,
      error: 'Supabase connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
