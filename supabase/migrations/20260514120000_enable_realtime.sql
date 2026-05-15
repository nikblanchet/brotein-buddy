-- Enable Supabase Realtime broadcasts for the sync tables (PR 3).
--
-- Realtime is a separate Postgres logical-replication publication
-- (`supabase_realtime`) that supabase-js can subscribe to via the
-- `postgres_changes` channel. By default no tables are in this publication;
-- we add ours so the client can react to remote writes.
--
-- Why both tables?
--   - `events` INSERT broadcasts cover every selection / box lifecycle event,
--     which is the bulk of cross-device chatter.
--   - `app_states` UPDATE broadcasts cover manual edits that don't emit a
--     timeline event (e.g. the +/- quantity buttons in the Inventory UI).
--     Without this, those edits would only propagate on the next reload.
--
-- RLS still applies: subscribers only receive rows they have SELECT access
-- to, so a user's events never leak to another user's channel.

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.app_states;
