-- Enable live room updates for queue, votes, and membership changes.
alter table public.queue_items replica identity full;
alter table public.votes replica identity full;
alter table public.room_members replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.queue_items;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.votes;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.room_members;
exception
  when duplicate_object then null;
end $$;