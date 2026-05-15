-- Initial schema for BroteinBuddy multi-device sync (PR 2).
--
-- Splits AppState into two tables on the server, mirroring the client layout
-- in src/types/models.ts and src/types/events.ts:
--
--   app_states  - one row per user, holding the snapshot (boxes, flavors,
--                 favorite, settings, version). Overwritten on every push.
--   events      - append-only timeline, keyed by the client-generated event
--                 id so re-pushing the same event is a no-op (idempotent).
--
-- Both tables are protected by row-level security: a signed-in user can read
-- and write only their own rows. The anon key (shipped in the client bundle)
-- gains nothing without a valid JWT.

----------------------------------------------------------------------
-- app_states: snapshot table (one row per user)
----------------------------------------------------------------------

create table public.app_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version integer not null default 3,
  boxes jsonb not null default '[]'::jsonb,
  flavors jsonb not null default '[]'::jsonb,
  favorite_flavor_id text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_states is
  'BroteinBuddy snapshot per user. Mirrors AppState minus events[] (which lives in public.events).';

-- updated_at is bumped by a trigger so clients don''t have to set it.
create or replace function public.set_app_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_states_set_updated_at
before update on public.app_states
for each row execute function public.set_app_states_updated_at();

----------------------------------------------------------------------
-- events: append-only timeline (one row per AppEvent)
----------------------------------------------------------------------

create table public.events (
  -- The client-generated `ev_<uuid>` id. Using it as the primary key makes
  -- re-pushing the same event idempotent: ON CONFLICT DO NOTHING on insert.
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  payload jsonb not null,
  event_timestamp timestamptz not null,
  inserted_at timestamptz not null default now()
);

comment on table public.events is
  'BroteinBuddy timeline. One row per AppEvent. Primary key is the client id so re-pushes are no-ops.';

create index events_user_id_timestamp_idx
  on public.events (user_id, event_timestamp);

----------------------------------------------------------------------
-- Row Level Security
----------------------------------------------------------------------

alter table public.app_states enable row level security;
alter table public.events     enable row level security;

create policy "app_states owner select"
  on public.app_states for select
  using (auth.uid() = user_id);

create policy "app_states owner insert"
  on public.app_states for insert
  with check (auth.uid() = user_id);

create policy "app_states owner update"
  on public.app_states for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "app_states owner delete"
  on public.app_states for delete
  using (auth.uid() = user_id);

create policy "events owner select"
  on public.events for select
  using (auth.uid() = user_id);

create policy "events owner insert"
  on public.events for insert
  with check (auth.uid() = user_id);

-- No update/delete policy on events: the timeline is append-only on the
-- server. Clients that want to remove rows must do it through a future
-- admin path (PR 3 may revisit if compaction is needed).
