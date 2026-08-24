-- Create a room and its creator membership atomically.
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

  insert into public.room_members (room_id, user_id)
  values (new_room.id, p_user_id);

  return new_room;
end;
$$;

grant execute on function public.create_room_with_member(text, text, text, uuid)
to authenticated;