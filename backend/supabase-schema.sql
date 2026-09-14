-- PromptForge personal workspace schema.
-- Run this in a Supabase project after enabling email authentication.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null default 1,
  name text not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.takes (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  created_at timestamptz not null default now(),
  image_path text,
  state_snapshot jsonb not null,
  variation_reason text,
  parent_take_id text,
  primary key (user_id, id),
  foreign key (user_id, character_id) references public.characters(user_id, id) on delete cascade
);

create table if not exists public.compiled_prompts (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  created_at timestamptz not null default now(),
  compiler jsonb not null,
  source_state jsonb not null,
  text text not null,
  edited boolean not null default false,
  primary key (user_id, id)
);

create table if not exists public.enrichment_reviews (
  id text not null default 'workspace',
  user_id uuid not null references auth.users(id) on delete cascade,
  queue jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.takes enable row level security;
alter table public.compiled_prompts enable row level security;
alter table public.enrichment_reviews enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own characters" on public.characters for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own takes" on public.takes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own prompts" on public.compiled_prompts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own enrichment reviews" on public.enrichment_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public) values ('promptforge-media', 'promptforge-media', false)
on conflict (id) do nothing;

create policy "own media read" on storage.objects for select using (bucket_id = 'promptforge-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own media write" on storage.objects for insert with check (bucket_id = 'promptforge-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own media delete" on storage.objects for delete using (bucket_id = 'promptforge-media' and (storage.foldername(name))[1] = auth.uid()::text);
