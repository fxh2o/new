(() => {
  'use strict';

  const API = '/api/query';

  function request(table, state) {
    const params = new URLSearchParams();
    params.set('table', table);
    if (state.select) params.set('select', state.select);
    for (const [key, value] of state.filters) params.append(key, value);
    if (state.order.length) params.set('order', state.order.map(x => `${x.column}.${x.ascending ? 'asc' : 'desc'}`).join(','));
    if (state.range) params.set('from', String(state.range[0]));
    if (state.range) params.set('to', String(state.range[1]));
    if (state.limit != null) params.set('limit', String(state.limit));

    const promise = fetch(`${API}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
    }).then(async response => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return { data: null, error: new Error(body.error || `Request failed (${response.status})`) };
      return { data: body.data ?? null, error: null };
    });
    return promise;
  }

  function builder(table) {
    const state = { select: '*', filters: [], order: [], range: null, limit: null };
    const chain = {
      select(columns = '*') { state.select = columns; return chain; },
      eq(column, value) { state.filters.push(['eq', column, String(value)]); return chain; },
      neq(column, value) { state.filters.push(['neq', column, String(value)]); return chain; },
      gt(column, value) { state.filters.push(['gt', column, String(value)]); return chain; },
      ilike(column, value) { state.filters.push(['ilike', column, String(value)]); return chain; },
      order(column, options = {}) { state.order.push({ column, ascending: options.ascending !== false }); return chain; },
      range(from, to) { state.range = [from, to]; return chain; },
      limit(value) { state.limit = value; return chain; },
      maybeSingle() {
        state.limit = 1;
        return request(table, state).then(result => ({
          data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data,
          error: result.error,
        }));
      },
      then(resolve, reject) { return request(table, state).then(resolve, reject); },
      catch(reject) { return request(table, state).catch(reject); },
    };
    return chain;
  }

  window.ANIPASTA_SUPABASE_CONFIG = { url: 'https://gateway.invalid', key: 'public-placeholder' };
  window.supabase = {
    createClient() {
      return {
        from: builder,
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      };
    },
  };
})();
