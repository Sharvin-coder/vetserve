-- The two parties to a task may see each other's display names — nothing
-- else, and nobody else's. Fixes "Accept ___'s help" rendering blank
-- (profiles RLS is own-row-only, which is correct and stays that way).

create or replace function public.task_party_name(p_user uuid)
returns text
language sql stable security definer set search_path = public as $$
  select p.display_name
  from public.profiles p
  where p.id = p_user
    and (
      p_user = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.tasks t
        where (t.posted_by = auth.uid() and t.claimed_by = p_user)
           or (t.claimed_by = auth.uid() and t.posted_by = p_user)
      )
    );
$$;

grant execute on function public.task_party_name(uuid) to authenticated;
