-- is_room_member is security definer (it has to be, to avoid recursive RLS on
-- room_members) and takes both arguments from the caller, so while it lived in
-- the public schema PostgREST exposed it at /rest/v1/rpc/is_room_member as a
-- membership oracle for private rooms.
--
-- It cannot simply have execute revoked: the room_members select policy calls
-- it, and RLS policies are evaluated with the caller's privileges, so revoking
-- makes every read of room_members fail with "permission denied for function".
--
-- Moving it to a schema PostgREST does not expose keeps the policy working
-- while removing the RPC surface. Granting usage on the schema does not expose
-- it; only the API's configured schema list does that.
create schema if not exists private;

revoke all on schema private from anon;
grant usage on schema private to authenticated;

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
  );
$$;

revoke execute on function private.is_room_member(uuid, uuid) from public;
grant execute on function private.is_room_member(uuid, uuid) to authenticated;

drop policy if exists "Members can view room members of rooms they belong to"
  on public.room_members;

create policy "Members can view room members of rooms they belong to"
  on public.room_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or private.is_room_member(room_id, auth.uid())
  );

drop function if exists public.is_room_member(uuid, uuid);
