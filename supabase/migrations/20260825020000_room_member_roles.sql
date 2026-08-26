-- Additive per-room membership role. Does not drop users, rooms, memberships,
-- or rooms.created_by. Existing rows are backfilled from rooms.created_by.

alter table public.room_members
  add column if not exists role text not null default 'member';

do $$
begin
  alter table public.room_members
    add constraint room_members_role_check
    check (role in ('creator', 'member'));
exception
  when duplicate_object then null;
end $$;

update public.room_members as membership
set role = 'creator'
from public.rooms as room
where membership.room_id = room.id
  and membership.user_id = room.created_by
  and membership.role is distinct from 'creator';

create unique index if not exists room_members_one_creator_per_room
  on public.room_members (room_id)
  where role = 'creator';

-- Joiners may only insert themselves as members. Room creation still uses
-- create_room_with_member (security definer), which writes role = 'creator'.
drop policy if exists "Users can join accessible rooms"
  on public.room_members;

create policy "Users can join accessible rooms"
  on public.room_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'member'
    and exists (
      select 1 from public.rooms
      where rooms.id = room_members.room_id
        and rooms.is_active = true
        and (
          rooms.visibility = 'public'
          or rooms.visibility = 'unlisted'
          or rooms.created_by = auth.uid()
        )
    )
  );

create or replace function public.protect_room_member_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.room_id is distinct from old.room_id
     or new.user_id is distinct from old.user_id
     or new.role is distinct from old.role then
    raise exception 'Cannot change room membership identity';
  end if;

  return new;
end;
$$;

create or replace function public.create_room_with_member(
  p_name text,
  p_description text,
  p_visibility text,
  p_user_id uuid
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room public.rooms;
begin
  if p_user_id <> auth.uid() then
    raise exception 'You can only create rooms for your own account';
  end if;

  insert into public.rooms (room_code, name, description, created_by, visibility)
  values (public.generate_room_code(), p_name, p_description, p_user_id, p_visibility)
  returning * into new_room;

  insert into public.room_members (room_id, user_id, role)
  values (new_room.id, p_user_id, 'creator');

  return new_room;
end;
$$;
