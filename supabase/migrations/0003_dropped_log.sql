-- Sentences the citation validator removed from VetGuide answers, kept for
-- the admin screen. Written by the API with the service role; admins read.

create table if not exists public.vetguide_dropped (
  id bigint generated always as identity primary key,
  question text not null,
  sentence text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.vetguide_dropped enable row level security;

create policy "admins read dropped sentences" on public.vetguide_dropped
  for select using (public.is_admin());
