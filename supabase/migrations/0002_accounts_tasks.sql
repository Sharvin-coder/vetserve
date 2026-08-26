-- Accounts, tasks, hours, notifications — with the privacy and state-machine
-- rules enforced IN the database, not just the API:
--   * a veteran's address lives in task_addresses, readable only by the
--     veteran and the student whose claim they accepted
--   * every task transition is a security-definer function that validates
--     role + current state; direct INSERT/UPDATE on tasks is denied by RLS

-- ---------- profiles ----------

create type public.user_role as enum ('veteran', 'student', 'admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'veteran',
  verified boolean not null default false,
  display_name text not null,
  zip text not null default '',
  school text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and verified
  );
$$;

create or replace function public.is_verified(required_role public.user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = required_role and verified
  );
$$;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "admins read all profiles" on public.profiles
  for select using (public.is_admin());

-- users may edit contact fields; role/verified are locked by column grants
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (display_name, zip, school) on public.profiles to authenticated;

-- profile row appears automatically on signup; role comes from signup metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  wanted text := coalesce(new.raw_user_meta_data ->> 'role', 'veteran');
begin
  if wanted not in ('veteran', 'student') then
    wanted := 'veteran';  -- admins are only ever promoted by hand
  end if;
  insert into public.profiles (id, role, display_name, zip, school)
  values (
    new.id,
    wanted::public.user_role,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Neighbor'),
    coalesce(new.raw_user_meta_data ->> 'zip', ''),
    nullif(new.raw_user_meta_data ->> 'school', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- tasks ----------

create type public.task_category as enum
  ('tech_help', 'yard', 'ride', 'errand', 'paperwork', 'company');

create type public.task_status as enum
  ('open', 'claimed', 'accepted', 'done', 'confirmed', 'cancelled');

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 3 and 120),
  category public.task_category not null,
  description text not null default '',
  zip text not null,
  est_hours numeric(4, 1) not null check (est_hours > 0 and est_hours <= 24),
  status public.task_status not null default 'open',
  posted_by uuid not null references public.profiles (id),
  claimed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- the address is deliberately NOT on tasks: separate table, separate RLS
create table if not exists public.task_addresses (
  task_id bigint primary key references public.tasks (id) on delete cascade,
  address text not null
);

alter table public.tasks enable row level security;
alter table public.task_addresses enable row level security;

-- any verified user may browse tasks; posters and claimants always see theirs
create policy "verified users browse tasks" on public.tasks
  for select using (
    posted_by = auth.uid()
    or claimed_by = auth.uid()
    or public.is_admin()
    or (
      status = 'open'
      and exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.verified
      )
    )
  );

-- address: the veteran who posted, the student whose claim was accepted, admins
create policy "address only after acceptance" on public.task_addresses
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          t.posted_by = auth.uid()
          or (t.claimed_by = auth.uid() and t.status in ('accepted', 'done', 'confirmed'))
        )
    )
    or public.is_admin()
  );

-- no direct writes: every mutation goes through the functions below
-- (RLS with no insert/update/delete policy denies them)

-- ---------- hours + notifications ----------

create table if not exists public.hours_log (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks (id),
  student_id uuid not null references public.profiles (id),
  veteran_id uuid not null references public.profiles (id),
  hours numeric(4, 1) not null check (hours > 0 and hours <= 24),
  confirmed_at timestamptz not null default now()
);

alter table public.hours_log enable row level security;

create policy "students read own hours" on public.hours_log
  for select using (student_id = auth.uid() or veteran_id = auth.uid() or public.is_admin());

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_id bigint references public.tasks (id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "read own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "mark own notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

-- ---------- the state machine ----------
-- open → claimed → accepted → done → confirmed, with cancel branches.
-- Every function: security definer, validates caller role + current state,
-- writes the notification row in the same transaction.

create or replace function public._notify(uid uuid, tid bigint, msg text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, task_id, message) values (uid, tid, msg);
$$;

create or replace function public.post_task(
  p_title text,
  p_category public.task_category,
  p_description text,
  p_zip text,
  p_address text,
  p_est_hours numeric
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  tid bigint;
begin
  if not public.is_verified('veteran') then
    raise exception 'only verified veterans can post tasks';
  end if;
  insert into public.tasks (title, category, description, zip, est_hours, posted_by)
  values (p_title, p_category, coalesce(p_description, ''), p_zip, p_est_hours, auth.uid())
  returning id into tid;
  if p_address is not null and p_address <> '' then
    insert into public.task_addresses (task_id, address) values (tid, p_address);
  end if;
  return tid;
end;
$$;

create or replace function public.claim_task(p_task bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
begin
  if not public.is_verified('student') then
    raise exception 'only verified students can claim tasks';
  end if;
  select * into t from public.tasks where id = p_task for update;
  if t.id is null or t.status <> 'open' then
    raise exception 'task is not open';
  end if;
  update public.tasks
    set status = 'claimed', claimed_by = auth.uid(), updated_at = now()
    where id = p_task;
  perform public._notify(
    t.posted_by, p_task,
    (select display_name from public.profiles where id = auth.uid()) ||
    ' offered to help with "' || t.title || '". Accept or decline.');
end;
$$;

create or replace function public.accept_claim(p_task bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = p_task for update;
  if t.id is null or t.posted_by <> auth.uid() or t.status <> 'claimed' then
    raise exception 'only the poster can accept a claimed task';
  end if;
  update public.tasks set status = 'accepted', updated_at = now() where id = p_task;
  perform public._notify(
    t.claimed_by, p_task,
    'Your offer on "' || t.title || '" was accepted. The address is now visible to you.');
end;
$$;

create or replace function public.decline_claim(p_task bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = p_task for update;
  if t.id is null or t.posted_by <> auth.uid() or t.status <> 'claimed' then
    raise exception 'only the poster can decline a claimed task';
  end if;
  update public.tasks
    set status = 'open', claimed_by = null, updated_at = now() where id = p_task;
  perform public._notify(
    t.claimed_by, p_task,
    'The veteran went another way on "' || t.title || '". Thanks for offering.');
end;
$$;

create or replace function public.mark_done(p_task bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = p_task for update;
  if t.id is null or t.claimed_by <> auth.uid() or t.status <> 'accepted' then
    raise exception 'only the accepted student can mark a task done';
  end if;
  update public.tasks set status = 'done', updated_at = now() where id = p_task;
  perform public._notify(
    t.posted_by, p_task,
    '"' || t.title || '" was marked done. Please confirm it went well.');
end;
$$;

create or replace function public.confirm_done(p_task bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = p_task for update;
  if t.id is null or t.posted_by <> auth.uid() or t.status <> 'done' then
    raise exception 'only the poster can confirm a done task';
  end if;
  update public.tasks set status = 'confirmed', updated_at = now() where id = p_task;
  insert into public.hours_log (task_id, student_id, veteran_id, hours)
  values (p_task, t.claimed_by, t.posted_by, t.est_hours);
  perform public._notify(
    t.claimed_by, p_task,
    'Hours confirmed for "' || t.title || '" — they now count toward your total.');
end;
$$;

create or replace function public.cancel_task(p_task bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = p_task for update;
  if t.id is null or t.posted_by <> auth.uid()
     or t.status not in ('open', 'claimed', 'accepted') then
    raise exception 'only the poster can cancel an unfinished task';
  end if;
  update public.tasks set status = 'cancelled', updated_at = now() where id = p_task;
  if t.claimed_by is not null then
    perform public._notify(
      t.claimed_by, p_task, '"' || t.title || '" was cancelled by the veteran.');
  end if;
end;
$$;

-- students may withdraw an offer they made (claimed → open)
create or replace function public.withdraw_claim(p_task bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = p_task for update;
  if t.id is null or t.claimed_by <> auth.uid() or t.status <> 'claimed' then
    raise exception 'only the claiming student can withdraw before acceptance';
  end if;
  update public.tasks
    set status = 'open', claimed_by = null, updated_at = now() where id = p_task;
  perform public._notify(
    t.posted_by, p_task, 'The offer on "' || t.title || '" was withdrawn. It is open again.');
end;
$$;

-- ---------- admin ----------

create or replace function public.admin_set_verified(p_user uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;
  update public.profiles set verified = p_verified where id = p_user;
end;
$$;

create or replace function public.admin_list_profiles()
returns setof public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles where public.is_admin() order by created_at desc;
$$;
