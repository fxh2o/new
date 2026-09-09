# AniPasta secure gateway

This repository is the security boundary for the public AniPasta frontend.

## Security model

Browser/local files never contain the real Supabase URL, publishable key, or any privileged key. The frontend talks to `/api/query`, and the server-side route talks to Supabase using environment variables.

Only the required public-read tables and columns are allowlisted. Supabase RLS remains the authorization layer.

## Required Vercel environment variables

Set these in Vercel Project Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Do **not** create `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Do not commit `.env` files.

The repository intentionally contains placeholder values only.

## Important limitation

No web frontend can make its code impossible to download or inspect. A determined user can inspect browser requests. The security goal is that inspecting/downloading the frontend does not reveal a privileged Supabase credential or allow direct database administration.

## Migration note

`public/index.html` currently uses pinned, read-only copies of the existing AniPasta frontend assets from the old repository while the server gateway is introduced. The final step is to vendor those assets into this repository and remove the old repository's exposed Supabase config.
