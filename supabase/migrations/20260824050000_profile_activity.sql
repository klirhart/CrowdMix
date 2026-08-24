-- Expose aggregate profile activity without exposing private room data.
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
    'rooms_joined', (select count(*) from public.room_members where user_id = p_user_id)
  );
$$;

grant execute on function public.get_profile_activity(uuid) to anon, authenticated;