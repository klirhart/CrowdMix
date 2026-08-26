-- Members need live recently-played updates. The creator already refreshes
-- locally after Play Next / Finish Song; everyone else was stuck on the
-- history loaded at join because play_history was not in supabase_realtime.
alter table public.play_history replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.play_history;
exception
  when duplicate_object then null;
end $$;
