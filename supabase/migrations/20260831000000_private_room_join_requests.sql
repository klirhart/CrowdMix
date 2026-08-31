-- Private rooms stay hidden from non-members. Join requests and owner
-- approvals go through security-definer RPCs so RLS is not weakened.

create table public.room_join_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

create index room_join_requests_room_id_idx on public.room_join_requests (room_id);
create index room_join_requests_requester_id_idx on public.room_join_requests (requester_id);

create unique index room_join_requests_one_pending
  on public.room_join_requests (room_id, requester_id)
  where status = 'pending';

alter table public.room_join_requests enable row level security;

create policy "Requesters can view their own join requests"
  on public.room_join_requests
  for select
  to authenticated
  using (requester_id = auth.uid());

create policy "Room creators can view join requests for their rooms"
  on public.room_join_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rooms
      where rooms.id = room_join_requests.room_id
        and rooms.created_by = auth.uid()
    )
  );

revoke insert, update, delete on public.room_join_requests from anon, authenticated;

create or replace function public.get_private_room_access(p_room_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  room_row public.rooms;
  member_exists boolean;
  request_status text;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in';
  end if;

  select *
  into room_row
  from public.rooms
  where room_code = upper(trim(p_room_code));

  if not found or room_row.visibility is distinct from 'private' then
    return jsonb_build_object('found', false);
  end if;

  if not room_row.is_active then
    return jsonb_build_object(
      'found', true,
      'inactive', true,
      'is_member', false,
      'can_request', false,
      'room_code', room_row.room_code,
      'room_name', room_row.name
    );
  end if;

  select exists (
    select 1
    from public.room_members
    where room_id = room_row.id
      and user_id = auth.uid()
      and is_active = true
  )
  into member_exists;

  if member_exists or room_row.created_by = auth.uid() then
    return jsonb_build_object(
      'found', true,
      'inactive', false,
      'is_member', true,
      'can_request', false,
      'room_code', room_row.room_code,
      'room_name', room_row.name
    );
  end if;

  select status
  into request_status
  from public.room_join_requests
  where room_id = room_row.id
    and requester_id = auth.uid()
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'found', true,
    'inactive', false,
    'is_member', false,
    'can_request', request_status is distinct from 'pending',
    'status', request_status,
    'room_code', room_row.room_code,
    'room_name', room_row.name
  );
end;
$$;

create or replace function public.request_to_join_private_room(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  room_row public.rooms;
  member_exists boolean;
  pending_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in';
  end if;

  select *
  into room_row
  from public.rooms
  where room_code = upper(trim(p_room_code));

  if not found or room_row.visibility is distinct from 'private' then
    raise exception 'Room not found';
  end if;

  if not room_row.is_active then
    raise exception 'This room is no longer active.';
  end if;

  if room_row.created_by = auth.uid() then
    raise exception 'You already own this room';
  end if;

  select exists (
    select 1
    from public.room_members
    where room_id = room_row.id
      and user_id = auth.uid()
      and is_active = true
  )
  into member_exists;

  if member_exists then
    raise exception 'You are already a member of this room';
  end if;

  select id
  into pending_id
  from public.room_join_requests
  where room_id = room_row.id
    and requester_id = auth.uid()
    and status = 'pending'
  limit 1;

  if pending_id is not null then
    return jsonb_build_object(
      'id', pending_id,
      'status', 'pending',
      'room_code', room_row.room_code,
      'room_name', room_row.name
    );
  end if;

  insert into public.room_join_requests (room_id, requester_id, status)
  values (room_row.id, auth.uid(), 'pending')
  returning id into pending_id;

  return jsonb_build_object(
    'id', pending_id,
    'status', 'pending',
    'room_code', room_row.room_code,
    'room_name', room_row.name
  );
end;
$$;

create or replace function public.resolve_room_join_request(p_request_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.room_join_requests;
  room_row public.rooms;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in';
  end if;

  select *
  into request_row
  from public.room_join_requests
  where id = p_request_id;

  if not found then
    raise exception 'Join request not found';
  end if;

  select *
  into room_row
  from public.rooms
  where id = request_row.room_id;

  if not found or room_row.created_by <> auth.uid() then
    raise exception 'Only the room owner can approve or decline this request';
  end if;

  if request_row.status is distinct from 'pending' then
    return jsonb_build_object('id', request_row.id, 'status', request_row.status);
  end if;

  if p_approve then
    insert into public.room_members (room_id, user_id, role, is_active, left_at, hidden_from_profile, is_online)
    values (room_row.id, request_row.requester_id, 'member', true, null, false, false)
    on conflict (room_id, user_id) do update
      set is_active = true,
          left_at = null,
          hidden_from_profile = false,
          is_online = false;
  end if;

  update public.room_join_requests
  set
    status = case when p_approve then 'approved' else 'declined' end,
    resolved_at = now(),
    resolved_by = auth.uid()
  where id = request_row.id;

  return jsonb_build_object(
    'id', request_row.id,
    'status', case when p_approve then 'approved' else 'declined' end
  );
end;
$$;

create or replace function public.list_pending_join_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be logged in';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(item))
    from (
      select
        request.id,
        request.room_id,
        request.requester_id,
        request.created_at,
        room.room_code,
        room.name as room_name,
        profile.username as requester_username,
        profile.display_name as requester_display_name,
        profile.avatar_url as requester_avatar_url
      from public.room_join_requests as request
      join public.rooms as room
        on room.id = request.room_id
      join public.profiles as profile
        on profile.id = request.requester_id
      where request.status = 'pending'
        and room.created_by = auth.uid()
      order by request.created_at desc
    ) as item
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_private_room_access(text) from public, anon;
revoke all on function public.request_to_join_private_room(text) from public, anon;
revoke all on function public.resolve_room_join_request(uuid, boolean) from public, anon;
revoke all on function public.list_pending_join_requests() from public, anon;

grant execute on function public.get_private_room_access(text) to authenticated;
grant execute on function public.request_to_join_private_room(text) to authenticated;
grant execute on function public.resolve_room_join_request(uuid, boolean) to authenticated;
grant execute on function public.list_pending_join_requests() to authenticated;

alter table public.room_join_requests replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.room_join_requests;
exception
  when duplicate_object then null;
end $$;
