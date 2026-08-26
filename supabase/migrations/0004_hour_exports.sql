-- Stored hour exports: the verification code on a student's PDF resolves
-- against these rows. No RLS select policy on purpose — lookups happen only
-- through the API's service role by exact code, so codes can't be enumerated.

create table if not exists public.hour_exports (
  code text primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  student_name text not null,
  school text not null default '',
  total_hours numeric(6, 1) not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.hour_exports enable row level security;
