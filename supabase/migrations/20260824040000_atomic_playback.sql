-- Advance playback under a transaction so concurrent actions cannot select
-- the same next song or leave multiple songs playing.
create or replace function public.advance_room_playback(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_item public.queue_items;
  next_item_id uuid;
begin
  if not exists (
    select 1 from public.rooms
    where id = p_room_id and created_by = auth.uid()
  ) then
    raise exception 'Only the room creator can control playback';
  end if;

  select * into current_item
  from public.queue_items
  where room_id = p_room_id and status = 'playing'
  for update;

  if current_item.id is not null then
    insert into public.play_history (
      room_id, song_id, queue_item_id, suggested_by, played_at
    ) values (
      current_item.room_id, current_item.song_id, current_item.id,
      current_item.suggested_by, now()
    );

    update public.queue_items
    set status = 'played', played_at = now()
    where id = current_item.id;
  end if;

  select qi.id into next_item_id
  from public.queue_items qi
  left join public.votes v on v.queue_item_id = qi.id
  where qi.room_id = p_room_id and qi.status = 'pending'
  group by qi.id
  order by count(v.id) desc, qi.created_at asc
  limit 1
  for update;

  if next_item_id is not null then
    update public.queue_items
    set status = 'playing', playing_started_at = now()
    where id = next_item_id;
  end if;

  return next_item_id;
end;
$$;

grant execute on function public.advance_room_playback(uuid) to authenticated;