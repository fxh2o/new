import { NextResponse } from 'next/server';
import { createServerSupabase, getBearerToken } from '../../../lib/supabase-server';

export const runtime = 'nodejs';

const headers = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    const db = createServerSupabase(token);
    const url = new URL(request.url);
    const animeId = url.searchParams.get('anime_id');

    if (!animeId) {
      return NextResponse.json({ error: 'anime_id is required' }, { status: 400, headers });
    }

    const { data, error } = await db
      .from('episodes')
      .select('*')
      .eq('anime_id', animeId)
      .order('season_number', { ascending: true })
      .order('episode_number', { ascending: true });

    if (error) return NextResponse.json({ error: 'Database request failed' }, { status: 500, headers });
    return NextResponse.json({ data: data ?? [] }, { headers });
  } catch (error) {
    console.error('episodes gateway error', error);
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500, headers });
  }
}
