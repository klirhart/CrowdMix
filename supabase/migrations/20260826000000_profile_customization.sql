-- Profile customization: extra public fields + user-owned image storage.
-- Existing profile rows stay intact; new columns are nullable.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists cover_url text,
  add column if not exists location text,
  add column if not exists website text;

alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles
  add constraint profiles_display_name_length
  check (char_length(display_name) between 1 and 50);

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 280);

alter table public.profiles drop constraint if exists profiles_location_length;
alter table public.profiles
  add constraint profiles_location_length
  check (location is null or char_length(location) <= 80);

alter table public.profiles drop constraint if exists profiles_website_length;
alter table public.profiles
  add constraint profiles_website_length
  check (website is null or char_length(website) <= 200);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view profile media" on storage.objects;
create policy "Public can view profile media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'profile-media');

drop policy if exists "Users can upload own profile media" on storage.objects;
create policy "Users can upload own profile media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update own profile media" on storage.objects;
create policy "Users can update own profile media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete own profile media" on storage.objects;
create policy "Users can delete own profile media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
