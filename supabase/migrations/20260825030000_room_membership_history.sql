-- Preserve room membership after Leave. Forget only hides a row from that
-- user's profile. Access to queue/playback still requires an active membership.

alter table public.room_members
  add column if not exists left_at timestamptz,
  add column if not exists is_active boolean not null default true,
  add column if not exists hidden_from_profile boolean not null default false;

update public.room_members
set is_active = true, hidden_from_profile = false
where is_active is distinct from true
   or hidden_from_profile is distinct from false;

do $$
begin
  alter table public.room_members
    add constraint room_members_leave_state_check
    check (
      (is_active = true and left_at is null)
      or (is_active = false and left_at is not null)
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists room_members_active_idx
  on public.room_members (room_id)
  where is_active = true;

create index if not exists room_members_profile_history_idx
  on public.room_members (user_id, joined_at desc)
  where hidden_from_profile = false;

create or replace function private.is_room_member(room_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.room_members
    where room_members.room_id = $1
      and room_members.user_id = $2
      and room_members.is_active = true
  );
$$;

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

  return new;
end;
$$;

drop policy if exists "Members can delete their own membership"
  on public.room_members;

drop policy if exists "Authenticated users can view their own rooms (any visibility)"
  on public.rooms;

create policy "Authenticated users can view their own rooms (any visibility)"
  on public.rooms
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or private.is_room_member(id, auth.uid())
  );

drop policy if exists "Members can view queue items in their rooms"
  on public.queue_items;

create policy "Members can view queue items in their rooms"
  on public.queue_items
  for select
  to authenticated
  using (private.is_room_member(room_id, auth.uid()));

drop policy if exists "Members can suggest songs in their rooms"
  on public.queue_items;

create policy "Members can suggest songs in their rooms"
  on public.queue_items
  for insert
  to authenticated
  with check (
    suggested_by = auth.uid()
    and status = 'pending'
    and private.is_room_member(room_id, auth.uid())
  );

drop policy if exists "Members can view play history of their rooms"
  on public.play_history;

create policy "Members can view play history of their rooms"
  on public.play_history
  for select
  to authenticated
  using (private.is_room_member(room_id, auth.uid()));

drop policy if exists "Members can view votes in their rooms"
  on public.votes;

create policy "Members can view votes in their rooms"
  on public.votes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.queue_items
      where queue_items.id = votes.queue_item_id
        and private.is_room_member(queue_items.room_id, auth.uid())
    )
  );

drop policy if exists "Members can vote in their rooms"
  on public.votes;

create policy "Members can vote in their rooms"
  on public.votes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.queue_items
      where queue_items.id = votes.queue_item_id
        and queue_items.status <> 'played'
        and private.is_room_member(queue_items.room_id, auth.uid())
    )
  );

create or replace function public.get_profile_activity(p_user_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'songs_suggested', (select count(*) from public.queue_items where suggested_by = p_user_id),
    'votes_cast', (select count(*) from public.votes where user_id = p_user_id),
    'rooms_joined', (
      select count(*) from public.room_members
      where user_id = p_user_id
        and hidden_from_profile = false
    )
  );
$$;

create or replace function public.get_profile_room_history(p_user_id uuid)
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
  is_active boolean
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
    membership.is_active
  from public.room_members as membership
  join public.rooms as room on room.id = membership.room_id
  join public.profiles as creator on creator.id = room.created_by
  where membership.user_id = p_user_id
    and membership.hidden_from_profile = false
    and (
      p_user_id = auth.uid()
      or room.visibility = 'public'
    )
  order by membership.is_active desc, membership.joined_at desc;
$$;

revoke execute on function public.get_profile_room_history(uuid) from public;
grant execute on function public.get_profile_room_history(uuid) to anon, authenticated;
