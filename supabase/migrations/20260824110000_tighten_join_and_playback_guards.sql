-- Suggestions must enter the queue as pending. After 80000 dropped the
-- queue_items UPDATE policy, INSERT was the remaining way for a member to
-- plant a 'playing' row and skip creator-only advance_room_playback.
drop policy if exists "Members can suggest songs in their rooms"
  on public.queue_items;

create policy "Members can suggest songs in their rooms"
  on public.queue_items
  for insert
  to authenticated
  with check (
    suggested_by = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.room_members
      where room_members.room_id = queue_items.room_id
        and room_members.user_id = auth.uid()
    )
  );

-- Join must respect is_active. The client already checked this; the API did not.
drop policy if exists "Users can join accessible rooms"
  on public.room_members;

create policy "Users can join accessible rooms"
  on public.room_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
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

-- RLS cannot restrict which columns an UPDATE touches. Presence only needs
-- is_online; without a trigger a member could PATCH room_id onto a private room.
create or replace function public.protect_room_member_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.room_id is distinct from old.room_id
     or new.user_id is distinct from old.user_id then
    raise exception 'Cannot change room membership identity';
  end if;

  return new;
end;
$$;

drop trigger if exists room_members_protect_identity on public.room_members;

create trigger room_members_protect_identity
  before update on public.room_members
  for each row
  execute function public.protect_room_member_identity();

-- advance_room_playback serializes on the room row, but nothing stopped a
-- leftover or injected second 'playing' row from surviving. One playing track
-- per room is the product rule.
create unique index if not exists queue_items_one_playing_per_room
  on public.queue_items (room_id)
  where status = 'playing';
