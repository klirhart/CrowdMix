-- Room chat for active members and the creator. Additive: does not change
-- rooms, membership, queue, votes, or playback.

create table public.room_messages (
  id uuid not null primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint room_messages_body_length check (
    char_length(btrim(body)) >= 1
    and char_length(body) <= 500
  )
);

create index room_messages_room_created_idx
  on public.room_messages (room_id, created_at desc);

alter table public.room_messages enable row level security;

grant select, insert on public.room_messages to authenticated;

create policy "Members can read chat in their rooms"
  on public.room_messages
  for select
  to authenticated
  using (private.is_room_member(room_id, auth.uid()));

create policy "Members can send chat in their rooms"
  on public.room_messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and private.is_room_member(room_id, auth.uid())
  );

alter table public.room_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.room_messages;
exception
  when duplicate_object then null;
end $$;
