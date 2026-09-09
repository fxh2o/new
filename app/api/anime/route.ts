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
    const id = url.searchParams.get('id');
    const q = url.searchParams.get('q')?.trim();
    const contentType = url.searchParams.get('content_type');
    const excludeId = url.searchParams.get('exclude_id');
    const limitParam = Number(url.searchParams.get('limit') || '0');
    const safeLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : null;

    if (id) {
      const { data, error } = await db
        .from('anime')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .maybeSingle();

      if (error) return NextResponse.json({ error: 'Database request failed' }, { status: 500, headers });
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404, headers });
      return NextResponse.json({ data }, { headers });
    }

    let query = db
      .from('anime')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (q) query = query.ilike('title', `%${q.replace(/[%_]/g, '')}%`);
    if (contentType) query = query.eq('content_type', contentType);
    if (excludeId) query = query.neq('id', excludeId);
    if (safeLimit) query = query.limit(safeLimit);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Database request failed' }, { status: 500, headers });

    return NextResponse.json({ data: data ?? [] }, { headers });
  } catch (error) {
    console.error('anime gateway error', error);
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500, headers });
  }
}
