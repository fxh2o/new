import { NextResponse } from 'next/server';
import { createServerSupabase, getBearerToken } from '../../../lib/supabase-server';

export const runtime = 'nodejs';

const TABLE_RULES: Record<string, { columns: Set<string>; filterColumns: Set<string>; orderColumns: Set<string> }> = {
  anime: {
    columns: new Set(['id', 'title', 'poster_url', 'content_type', 'is_published', 'movie_duration', 'movie_url', 'download_links', 'created_at']),
    filterColumns: new Set(['id', 'title', 'content_type', 'is_published']),
    orderColumns: new Set(['created_at', 'title']),
  },
  episodes: {
    columns: new Set(['id', 'anime_id', 'season_number', 'episode_number', 'video_url', 'created_at']),
    filterColumns: new Set(['id', 'anime_id']),
    orderColumns: new Set(['season_number', 'episode_number', 'created_at']),
  },
  notifications: {
    columns: new Set(['id', 'title', 'message', 'created_at', 'expires_at', 'is_active']),
    filterColumns: new Set(['is_active', 'expires_at']),
    orderColumns: new Set(['created_at', 'expires_at']),
  },
};

const FILTERS = new Set(['eq', 'neq', 'gt', 'ilike']);
const headers = {
  'Cache-Control': 'private, no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function safeColumns(raw: string | null, rule: typeof TABLE_RULES[string]) {
  const value = (raw || '*').trim();
  if (value === '*') return [...rule.columns].join(',');
  const columns = value.split(',').map(x => x.trim()).filter(Boolean);
  if (!columns.length || columns.length > rule.columns.size || columns.some(x => !rule.columns.has(x))) {
    throw new Error('Invalid select');
  }
  return columns.join(',');
}

function safeIdentifier(value: string, allowed: Set<string>) {
  return allowed.has(value) ? value : null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const table = url.searchParams.get('table') || '';
    const rule = TABLE_RULES[table];
    if (!rule) return NextResponse.json({ error: 'Unsupported table' }, { status: 400, headers });

    const db = createServerSupabase(getBearerToken(request));
    let query = db.from(table).select(safeColumns(url.searchParams.get('select'), rule));

    for (const [key, value] of url.searchParams.entries()) {
      if (!FILTERS.has(key)) continue;
      const [column, ...rest] = value.split('=');
      const filterValue = rest.join('=');
      if (!safeIdentifier(column, rule.filterColumns)) {
        return NextResponse.json({ error: 'Invalid filter' }, { status: 400, headers });
      }
      query = key === 'eq' ? query.eq(column, filterValue)
        : key === 'neq' ? query.neq(column, filterValue)
        : key === 'gt' ? query.gt(column, filterValue)
        : query.ilike(column, filterValue);
    }

    const orderRaw = url.searchParams.get('order');
    if (orderRaw) {
      for (const part of orderRaw.split(',').slice(0, 4)) {
        const [column, direction] = part.split('.');
        if (!safeIdentifier(column, rule.orderColumns)) throw new Error('Invalid order');
        query = query.order(column, { ascending: direction !== 'desc' });
      }
    }

    const from = Number(url.searchParams.get('from'));
    const to = Number(url.searchParams.get('to'));
    if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= from && to - from <= 500) {
      query = query.range(from, to);
    }

    const limit = Number(url.searchParams.get('limit'));
    if (Number.isInteger(limit) && limit > 0) query = query.limit(Math.min(limit, 50));

    const { data, error } = await query;
    if (error) {
      console.error('query gateway database error', error);
      return NextResponse.json({ error: 'Database request failed' }, { status: 500, headers });
    }
    return NextResponse.json({ data: data ?? [] }, { headers });
  } catch (error) {
    console.error('query gateway error', error);
    return NextResponse.json({ error: 'Invalid gateway request' }, { status: 400, headers });
  }
}
