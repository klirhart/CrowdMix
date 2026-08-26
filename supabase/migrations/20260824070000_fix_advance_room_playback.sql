-- Playback could never advance: PostgreSQL rejects "for update" on a grouped
-- query ("FOR UPDATE is not allowed with GROUP BY clause"), and PL/pgSQL only
-- plans embedded SQL on first execution, so the old definition installed fine
-- and then failed on every call. Rank the candidates in a subquery and lock the
-- single chosen row instead.
--
-- The room row is also locked up front. Previously two concurrent advances could
-- both get past the "playing" lookup and each promote a different pending song,
-- leaving two rows in 'playing'. Serializing on the room makes that impossible.
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

  perform 1 from public.rooms where id = p_room_id for update;

  select * into current_item
  from public.queue_items
  where room_id = p_room_id and status = 'playing'
  limit 1
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

revoke execute on function public.advance_room_playback(uuid) from public;
grant execute on function public.advance_room_playback(uuid) to authenticated;
