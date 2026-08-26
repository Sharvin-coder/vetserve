-- Explicit least-privilege grants. Newer Supabase Postgres images grant the
-- API roles almost nothing by default, so every table needs its grants
-- spelled out. RLS still applies on top of all of these for anon/authenticated
-- (service_role bypasses RLS by design; it never leaves the API).

-- VetGuide corpus: readable by everyone, written only by ingestion
grant select on public.chunks to anon, authenticated;
grant all on public.chunks to service_role;

-- anonymous thumbs feedback: write-only for the public, admin reads via API
grant insert on public.feedback to anon, authenticated;
grant all on public.feedback to service_role;

-- profiles: users read (their own row, per RLS); column grants for edits
-- were set in 0002; admins act through security-definer functions
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- task board: reads under RLS; ALL mutations go through the security-definer
-- state machine (whose owner has table rights), so no INSERT/UPDATE grants
grant select on public.tasks to authenticated;
grant all on public.tasks to service_role;

grant select on public.task_addresses to authenticated;
grant all on public.task_addresses to service_role;

grant select on public.hours_log to authenticated;
grant all on public.hours_log to service_role;

grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
-- (column grant for UPDATE(read) was set in 0002)

-- hour exports + dropped-sentence log: service role only
grant all on public.hour_exports to service_role;
grant all on public.vetguide_dropped to service_role;

-- identity columns draw from sequences
grant usage on all sequences in schema public to anon, authenticated, service_role;

-- RPC: retrieval functions for everyone, the rest for signed-in users; every
-- state-machine/admin function re-checks the caller's role internally
grant execute on all functions in schema public to anon, authenticated, service_role;
