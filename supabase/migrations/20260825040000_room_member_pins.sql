-- Personal pin for the sidebar room list. Does not change room membership,
-- leave/forget, or who can access the room.

alter table public.room_members
  add column if not exists pinned_at timestamptz;

create index if not exists room_members_pinned_idx
  on public.room_members (user_id, pinned_at desc)
  where hidden_from_profile = false and pinned_at is not null;

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

  if old.is_active = false and new.is_active = true then
    if auth.uid() is distinct from new.user_id then
      raise exception 'You can only rejoin a room as yourself';
    end if;

    if not exists (
      select 1 from public.rooms
      where rooms.id = new.room_id
        and rooms.is_active = true
        and (
          rooms.visibility in ('public', 'unlisted')
          or rooms.created_by = auth.uid()
        )
    ) then
      raise exception 'This room is no longer joinable';
    end if;
  end if;

  if new.hidden_from_profile = true then
    if auth.uid() is distinct from new.user_id then
      raise exception 'You can only forget rooms from your own history';
    end if;

    if new.is_active = true then
      raise exception 'Leave the room before removing it from your history';
    end if;
  end if;

  if new.pinned_at is distinct from old.pinned_at
     and auth.uid() is distinct from new.user_id then
    raise exception 'You can only pin rooms on your own list';
  end if;

  return new;
end;
$$;

drop function if exists public.get_profile_room_history(uuid);

create function public.get_profile_room_history(p_user_id uuid)
returns table (
  room_id uuid,
  room_code text,
  name text,
  visibility text,
  room_is_active boolean,
  created_by uuid,
  creator_username text,
  creator_display_name text,
  role text,
  joined_at timestamptz,
  left_at timestamptz,
  is_active boolean,
  pinned_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    room.id,
    room.room_code,
    room.name,
    room.visibility,
    room.is_active,
    room.created_by,
    creator.username,
    creator.display_name,
    membership.role,
    membership.joined_at,
    membership.left_at,
    membership.is_active,
    membership.pinned_at
  from public.room_members as membership
  join public.rooms as room on room.id = membership.room_id
  join public.profiles as creator on creator.id = room.created_by
  where membership.user_id = p_user_id
    and membership.hidden_from_profile = false
    and (
      p_user_id = auth.uid()
      or room.visibility = 'public'
    )
  order by
    membership.pinned_at desc nulls last,
    membership.is_active desc,
    membership.joined_at desc;
$$;

revoke execute on function public.get_profile_room_history(uuid) from public;
grant execute on function public.get_profile_room_history(uuid) to anon, authenticated;
