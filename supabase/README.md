# Supabase setup for BroteinBuddy

This directory holds the Supabase project configuration and SQL migrations
for the multi-device sync backend introduced in PR 2.

## One-time setup

1. **Install the Supabase CLI:**

   ```bash
   brew install supabase/tap/supabase
   ```

2. **Create the remote project** at <https://supabase.com> (free tier is fine).
   Copy the project ref from the URL (`https://supabase.com/dashboard/project/<ref>`).

3. **Log in and link this repo to your project:**

   ```bash
   supabase login
   supabase link --project-ref <your-ref>
   ```

4. **Apply migrations:**

   ```bash
   supabase db push
   ```

   This runs every `.sql` file under `migrations/` against the remote project
   in timestamp order. Re-running `db push` is safe — already-applied
   migrations are skipped.

5. **Configure auth redirect URLs** in the Supabase dashboard
   (`Authentication → URL Configuration`):
   - Site URL: `https://brotein-buddy.vercel.app`
   - Redirect URLs:
     - `https://brotein-buddy.vercel.app`
     - `http://localhost:5173` (for `npm run dev`)
     - Any Vercel preview URL pattern if you want magic links from PR previews

6. **Copy the project URL and `anon` key** from
   `Project Settings → API` and add them to:
   - `.env.local` for local dev (file is git-ignored)
   - Vercel project env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Local development against a Dockerised Supabase

If you have Docker running, `supabase start` spins up a full local stack
(Postgres + Auth + Studio) so you don't need the remote project for
development:

```bash
supabase start
# Studio:    http://localhost:54323
# API URL:   http://localhost:54321
# anon key:  printed by `supabase status`
```

Put the local URL + anon key in `.env.local` and the app will hit your
machine instead of the remote.

## Schema overview

Two tables, both protected by row-level security so a signed-in user can
only access their own rows:

- **`app_states`** — one row per user. Holds the boxes/flavors/favorite/
  settings/version snapshot. Overwritten on every client push.
- **`events`** — append-only timeline. Primary key is the
  client-generated `ev_<uuid>` so re-pushing the same event is idempotent.

The split mirrors the client layout (snapshot in `AppState`, append-only
log in `AppState.events`) and positions PR 3 to subscribe to the `events`
table in realtime.

See `docs/adr/012-supabase-sync.md` for the rationale and
`docs/teaching/1.7-supabase-magic-link-sync.md` for a deeper walkthrough.
