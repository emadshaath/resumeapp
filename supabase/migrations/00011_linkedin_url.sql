-- Add LinkedIn URL to profiles
alter table public.profiles
  add column if not exists linkedin_url text;
