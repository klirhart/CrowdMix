-- "Unlisted" is offered in the create-room form as "only accessible via room
-- code, link, or QR code", and the room_members insert policy already permits
-- joining an unlisted room. But no select policy ever exposed one, so
-- getRoomByCode came back empty for non-members and the join failed with
-- "Room not found" — the advertised code, link, and QR flows were all dead.
--
-- Unlisted means unlisted, not secret: discovery stays closed because
-- searchPublicRooms filters on visibility = 'public', so these rooms remain
-- absent from search while a known code now resolves.
create policy "Unlisted rooms are viewable by authenticated users"
  on public.rooms
  for select
  to authenticated
  using (visibility = 'unlisted');
