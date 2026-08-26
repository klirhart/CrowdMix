-- Shared room playback: any member can advance, and concurrent ENDED events
-- from several clients cannot skip extra songs. Source of truth remains
-- queue_items.status + playing_started_at (no pause column — rooms do not pause).

drop function if exists public.advance_room_playback(uuid);
drop function if exists public.advance_room_playback(uuid, uuid);

create function public.advance_room_playback(
  p_room_id uuid,
  p_from_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_item public.queue_items;
  next_item_id uuid;
begin
  if auth.uid() is null or not private.is_room_member(p_room_id, auth.uid()) then
    raise exception 'Only room members can control playback';
  end if;

  perform 1 from public.rooms where id = p_room_id for update;

  select * into current_item
  from public.queue_items
  where room_id = p_room_id and status = 'playing'
  limit 1
  for update;

  -- Another client already advanced past this song.
  if p_from_item_id is not null then
    if current_item.id is null or current_item.id is distinct from p_from_item_id then
      return current_item.id;
    end if;
  end if;

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
  where qi.id = (
    select ranked.id
    from public.queue_items ranked
    left join public.votes v on v.queue_item_id = ranked.id
    where ranked.room_id = p_room_id and ranked.status = 'pending'
    group by ranked.id
    order by count(v.id) desc, ranked.created_at asc
    limit 1
  )
  for update;

  if next_item_id is not null then
    update public.queue_items
    set status = 'playing', playing_started_at = now()
    where id = next_item_id;
  end if;

  return next_item_id;
end;
$$;

revoke execute on function public.advance_room_playback(uuid, uuid) from public, anon;
grant execute on function public.advance_room_playback(uuid, uuid) to authenticated;

-- Start the highest-voted pending song only when nothing is playing.
-- Unlike advance_room_playback, this never finishes a current track, so two
-- members joining an idle room cannot skip past the first song.
create or replace function public.ensure_room_playing(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid;
  next_item_id uuid;
begin
  if auth.uid() is null or not private.is_room_member(p_room_id, auth.uid()) then
    raise exception 'Only room members can control playback';
  end if;

  perform 1 from public.rooms where id = p_room_id for update;

  select id into current_id
  from public.queue_items
  where room_id = p_room_id and status = 'playing'
  limit 1
  for update;

  if current_id is not null then
    return current_id;
  end if;

  select qi.id into next_item_id
  from public.queue_items qi
  where qi.id = (
    select ranked.id
    from public.queue_items ranked
    left join public.votes v on v.queue_item_id = ranked.id
    where ranked.room_id = p_room_id and ranked.status = 'pending'
    group by ranked.id
    order by count(v.id) desc, ranked.created_at asc
    limit 1
  )
  for update;

  if next_item_id is not null then
    update public.queue_items
    set status = 'playing', playing_started_at = now()
    where id = next_item_id;
  end if;

  return next_item_id;
end;
$$;

revoke execute on function public.ensure_room_playing(uuid) from public, anon;
grant execute on function public.ensure_room_playing(uuid) to authenticated;
