-- RLS cannot restrict *which columns* an update touches, so a membership-only
-- update policy on queue_items let any member set their own song to 'playing'
-- (defeating the creator check inside advance_room_playback), rewrite
-- suggested_by to forge attribution, or move a row into another room they belong
-- to. Every status transition already goes through advance_room_playback, which
-- is security definer and therefore needs no policy at all.
drop policy if exists "Members can update queue item status in their rooms"
  on public.queue_items;

-- play_history insert was `with check (true)` granted to authenticated, so any
-- signed-in user could fabricate history rows in rooms they had never joined.
-- The only legitimate writer is advance_room_playback, which bypasses RLS.
drop policy if exists "Service can insert play history"
  on public.play_history;

-- Withdrawing a suggestion should only apply to songs still waiting. The old
-- `status != 'playing'` test also allowed deleting 'played' rows, and
-- play_history.queue_item_id cascades on delete, so a suggester could erase a
-- room's history. The client already filters on status = 'pending'.
drop policy if exists "Users can remove their own suggestions"
  on public.queue_items;

create policy "Users can remove their own suggestions"
  on public.queue_items
  for delete
  to authenticated
  using (suggested_by = auth.uid() and status = 'pending');

-- PostgREST exposes every public-schema function as RPC, and Supabase's default
-- privileges grant execute directly to anon and authenticated (not via PUBLIC),
-- so those roles have to be named explicitly here.
--
-- These are internal helpers, called from inside other definer functions or
-- dead code. is_room_member needs different handling and is dealt with in
-- 20260824100000: it is referenced by an RLS policy, and policy evaluation runs
-- with the caller's privileges, so simply revoking execute makes every query
-- against room_members fail with "permission denied for function".
revoke execute on function public.generate_room_code() from anon, authenticated;
revoke execute on function public.get_vote_count(uuid) from anon, authenticated;
revoke execute on function public.get_next_playing_song(uuid) from anon, authenticated;

-- These two are called from the client by signed-in users, so only anon goes.
revoke execute on function public.advance_room_playback(uuid) from anon;
revoke execute on function public.create_room_with_member(text, text, text, uuid) from anon;

-- handle_new_user and rls_auto_enable are deliberately left alone. Both are
-- trigger bodies that reference trigger-only context, so a direct RPC call
-- errors out before doing anything, and handle_new_user is on the signup path
-- where a mistaken revoke would be far more costly than the finding.

-- A mutable search_path lets a caller shadow unqualified references. Every body
-- below already schema-qualifies its tables, so an empty path is safe.
alter function public.generate_room_code() set search_path = '';
alter function public.get_vote_count(uuid) set search_path = '';
alter function public.get_next_playing_song(uuid) set search_path = '';
