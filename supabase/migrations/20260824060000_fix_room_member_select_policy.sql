-- A user must be able to read their own membership row.
--
-- is_room_member() is STABLE, so it evaluates against the snapshot taken at the
-- start of the statement. During "insert ... returning" that snapshot predates
-- the new row, so the SELECT policy rejected it and the join failed with 42501.
-- Comparing user_id directly needs no snapshot, so the inserting user can always
-- read back their own row.
drop policy if exists "Members can view room members of rooms they belong to"
  on public.room_members;

create policy "Members can view room members of rooms they belong to"
  on public.room_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_room_member(room_id, auth.uid())
  );
