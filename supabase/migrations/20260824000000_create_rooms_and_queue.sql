-- CrowdMix Phase 4: Rooms, Queue, Votes, and History Tables

-- ============================================================================
-- ROOMS TABLE
-- ============================================================================

create table public.rooms (
  id uuid not null primary key default gen_random_uuid(),
  room_code text not null unique,
  name text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_name_length check (char_length(name) >= 3 and char_length(name) <= 50),
  constraint rooms_description_length check (char_length(description) <= 500),
  constraint rooms_code_length check (char_length(room_code) = 5),
  constraint rooms_code_format check (room_code ~ '^[A-Z0-9]+$')
);

create index rooms_room_code_idx on public.rooms (room_code);
create index rooms_created_by_idx on public.rooms (created_by);
create index rooms_visibility_idx on public.rooms (visibility);
create index rooms_is_active_idx on public.rooms (is_active);
create index rooms_created_at_idx on public.rooms (created_at desc);

alter table public.rooms enable row level security;

-- ============================================================================
-- ROOM MEMBERS TABLE
-- ============================================================================

create table public.room_members (
  id uuid not null primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  is_online boolean not null default true,
  constraint room_members_unique unique (room_id, user_id)
);

create index room_members_room_id_idx on public.room_members (room_id);
create index room_members_user_id_idx on public.room_members (user_id);
create index room_members_is_online_idx on public.room_members (is_online);

alter table public.room_members enable row level security;

-- ============================================================================
-- SONGS TABLE
-- ============================================================================

create table public.songs (
  id uuid not null primary key default gen_random_uuid(),
  youtube_id text not null unique,
  title text not null,
  artist text not null,
  thumbnail_url text,
  duration integer,
  created_at timestamptz not null default now(),
  constraint songs_title_length check (char_length(title) > 0),
  constraint songs_artist_length check (char_length(artist) > 0),
  constraint songs_youtube_id_length check (char_length(youtube_id) > 0)
);

create index songs_youtube_id_idx on public.songs (youtube_id);
create index songs_created_at_idx on public.songs (created_at desc);

alter table public.songs enable row level security;

-- ============================================================================
-- QUEUE ITEMS TABLE
-- ============================================================================

create type queue_status as enum ('pending', 'playing', 'played', 'removed');

create table public.queue_items (
  id uuid not null primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  suggested_by uuid not null references public.profiles(id) on delete cascade,
  status queue_status not null default 'pending',
  created_at timestamptz not null default now(),
  playing_started_at timestamptz,
  played_at timestamptz
);

create unique index queue_items_unique_pending_song_per_room
on public.queue_items (room_id, song_id)
where status = 'pending';

create index queue_items_room_id_idx on public.queue_items (room_id);
create index queue_items_song_id_idx on public.queue_items (song_id);
create index queue_items_suggested_by_idx on public.queue_items (suggested_by);
create index queue_items_status_idx on public.queue_items (status);
create index queue_items_room_status_idx on public.queue_items (room_id, status);
create index queue_items_created_at_idx on public.queue_items (created_at);

alter table public.queue_items enable row level security;

-- ============================================================================
-- VOTES TABLE
-- ============================================================================

create table public.votes (
  id uuid not null primary key default gen_random_uuid(),
  queue_item_id uuid not null references public.queue_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint votes_unique unique (queue_item_id, user_id)
);

create index votes_queue_item_id_idx on public.votes (queue_item_id);
create index votes_user_id_idx on public.votes (user_id);
create index votes_created_at_idx on public.votes (created_at);

alter table public.votes enable row level security;

-- ============================================================================
-- PLAY HISTORY TABLE
-- ============================================================================

create table public.play_history (
  id uuid not null primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  queue_item_id uuid not null references public.queue_items(id) on delete cascade,
  suggested_by uuid not null references public.profiles(id) on delete cascade,
  played_at timestamptz not null default now(),
  duration_played integer
);

create index play_history_room_id_idx on public.play_history (room_id);
create index play_history_song_id_idx on public.play_history (song_id);
create index play_history_played_at_idx on public.play_history (played_at desc);
create index play_history_room_played_at_idx on public.play_history (room_id, played_at desc);

alter table public.play_history enable row level security;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- ROOMS: Public rooms visible to everyone, unlisted/private only to members
create policy "Public rooms are viewable by everyone"
  on public.rooms
  for select
  to anon, authenticated
  using (visibility = 'public');

create policy "Authenticated users can view their own rooms (any visibility)"
  on public.rooms
  for select
  to authenticated
  using (
    created_by = auth.uid() 
    or exists (
      select 1 from public.room_members 
      where room_members.room_id = rooms.id 
      and room_members.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create rooms"
  on public.rooms
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Room creators can update their own rooms"
  on public.rooms
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Room creators can delete their own rooms"
  on public.rooms
  for delete
  to authenticated
  using (created_by = auth.uid());

-- ROOM MEMBERS: Members can view other members in rooms they belong to
create policy "Members can view room members of rooms they belong to"
  on public.room_members
  for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members as rm
      where rm.room_id = room_members.room_id
      and rm.user_id = auth.uid()
    )
  );

create policy "Users can join accessible rooms"
  on public.room_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.rooms
      where rooms.id = room_members.room_id
      and (
        rooms.visibility = 'public'
        or rooms.visibility = 'unlisted'
        or rooms.created_by = auth.uid()
      )
    )
  );

create policy "Members can update their own membership"
  on public.room_members
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Members can delete their own membership"
  on public.room_members
  for delete
  to authenticated
  using (user_id = auth.uid());

-- SONGS: Anyone can view songs
create policy "Songs are viewable by everyone"
  on public.songs
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can create songs"
  on public.songs
  for insert
  to authenticated
  with check (true);

-- QUEUE ITEMS: Members can view queue in rooms they belong to
create policy "Members can view queue items in their rooms"
  on public.queue_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members
      where room_members.room_id = queue_items.room_id
      and room_members.user_id = auth.uid()
    )
  );

create policy "Members can suggest songs in their rooms"
  on public.queue_items
  for insert
  to authenticated
  with check (
    suggested_by = auth.uid()
    and exists (
      select 1 from public.room_members
      where room_members.room_id = queue_items.room_id
      and room_members.user_id = auth.uid()
    )
  );

create policy "Members can update queue item status in their rooms"
  on public.queue_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.room_members
      where room_members.room_id = queue_items.room_id
      and room_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.room_members
      where room_members.room_id = queue_items.room_id
      and room_members.user_id = auth.uid()
    )
  );

create policy "Users can remove their own suggestions"
  on public.queue_items
  for delete
  to authenticated
  using (
    suggested_by = auth.uid()
    and status != 'playing'
  );

-- VOTES: Members can view votes in their rooms
create policy "Members can view votes in their rooms"
  on public.votes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.queue_items
      join public.room_members on room_members.room_id = queue_items.room_id
      where queue_items.id = votes.queue_item_id
      and room_members.user_id = auth.uid()
    )
  );

create policy "Members can vote in their rooms"
  on public.votes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.queue_items
      join public.room_members on room_members.room_id = queue_items.room_id
      where queue_items.id = votes.queue_item_id
      and room_members.user_id = auth.uid()
      and queue_items.status != 'played'
    )
  );

create policy "Users can remove their own votes"
  on public.votes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- PLAY HISTORY: Members can view history of rooms they belong to
create policy "Members can view play history of their rooms"
  on public.play_history
  for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members
      where room_members.room_id = play_history.room_id
      and room_members.user_id = auth.uid()
    )
  );

create policy "Service can insert play history"
  on public.play_history
  for insert
  to authenticated
  with check (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate a unique room code
create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  new_code text;
  code_exists boolean;
begin
  loop
    new_code := upper(
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(48 + floor(random() * 10)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(48 + floor(random() * 10)::int)
    );
    
    select exists(select 1 from public.rooms where room_code = new_code) into code_exists;
    
    if not code_exists then
      return new_code;
    end if;
  end loop;
end;
$$;

-- Function to get vote count for a queue item
create or replace function public.get_vote_count(queue_item_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer from public.votes
  where votes.queue_item_id = $1;
$$;

-- Function to check if user is member of room
create or replace function public.is_room_member(room_id uuid, user_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.room_members
    where room_members.room_id = $1
    and room_members.user_id = $2
  );
$$;

-- Function to get highest voted pending song for a room
create or replace function public.get_next_playing_song(room_id uuid)
returns uuid
language sql
stable
as $$
  select queue_items.id
  from public.queue_items
  left join public.votes on votes.queue_item_id = queue_items.id
  where queue_items.room_id = $1
  and queue_items.status = 'pending'
  group by queue_items.id
  order by count(votes.id) desc, queue_items.created_at asc
  limit 1;
$$;
