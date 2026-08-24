-- Avoid recursive RLS evaluation when checking room membership.
create or replace function public.is_room_member(room_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.room_members
    where room_members.room_id = $1
      and room_members.user_id = $2
  );
$$;

drop policy if exists "Members can view room members of rooms they belong to"
  on public.room_members;

create policy "Members can view room members of rooms they belong to"
  on public.room_members
  for select
  to authenticated
  using (public.is_room_member(room_id, auth.uid()));