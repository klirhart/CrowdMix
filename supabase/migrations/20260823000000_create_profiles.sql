-- CrowdMix profiles table, RLS policies, and signup trigger

create table public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  username text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) >= 3 and char_length(username) <= 20),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]+$'),
  constraint profiles_username_unique unique (username)
);

create index profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_username text;
  normalized_username text;
  raw_display_name text;
begin
  raw_username := new.raw_user_meta_data ->> 'username';
  normalized_username := lower(trim(raw_username));
  raw_display_name := trim(new.raw_user_meta_data ->> 'display_name');

  if normalized_username is null or normalized_username = '' then
    raise exception 'Username is required';
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    normalized_username,
    coalesce(nullif(raw_display_name, ''), normalized_username),
    null
  );

  return new;
exception
  when unique_violation then
    raise exception 'Username is already taken';
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
