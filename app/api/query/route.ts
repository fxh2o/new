import { NextResponse } from 'next/server';
import { createServerSupabase, getBearerToken } from '../../../lib/supabase-server';

export const runtime = 'nodejs';

const ALLOWED_TABLES = new Set(['anime', 'episodes', 'notifications']);
const FILTERS = new Set(['eq', 'neq', 'gt', 'ilike']);
const headers = {
  'Cache-Control': 'private, no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function safeColumns(raw: string | null) {
  const value = (raw || '*').trim();
  if (!value || value === '*') return '*';
  const columns = value.split(',').map(x => x.trim()).filter(Boolean);
  if (!columns.length || columns.length > 25) throw new Error('Invalid select');
  if (columns.some(x => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(x))) throw new Error('Invalid select');
  return columns.join(',');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const table = url.searchParams.get('table');
    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: 'Unsupported table' }, { status: 400, headers });
    }

    const db = createServerSupabase(getBearerToken(request));
    let query = db.from(table).select(safeColumns(url.searchParams.get('select')));

    for (const [key, value] of url.searchParams.entries()) {
      if (!FILTERS.has(key)) continue;
      const [column, ...rest] = value.split('=');
      const filterValue = rest.join('=');
      if (!column || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(column) || column.length > 64) {
        return NextResponse.json({ error: 'Invalid filter' }, { status: 400, headers });
      }
      query = key === 'eq' ? query.eq(column, filterValue)
        : key === 'neq' ? query.neq(column, filterValue)
        : key === 'gt' ? query.gt(column, filterValue)
        : query.ilike(column, filterValue);
    }

    const orderRaw = url.searchParams.get('order');
    if (orderRaw) {
      const parts = orderRaw.split(',').slice(0, 4);
      for (const part of parts) {
        const [column, direction] = part.split('.');
        if (!column || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) throw new Error('Invalid order');
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
