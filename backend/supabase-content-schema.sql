-- CharacterFlow normalized content catalogue. This is separate from the personal workspace schema.
create extension if not exists pgcrypto;

create table if not exists public.archetypes (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  name text not null, description text not null default '', icon text, colour text,
  status text not null default 'active' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.content_domains (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  name text not null, description text not null default ''
);
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(), domain_id uuid not null references public.content_domains(id) on delete cascade,
  slug text not null, label text not null, description text not null default '', metadata jsonb not null default '{}'::jsonb,
  provenance text not null default 'curated', review_status text not null default 'approved' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(domain_id, slug)
);
create table if not exists public.archetype_influences (
  id uuid primary key default gen_random_uuid(), archetype_id uuid not null references public.archetypes(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  weight numeric not null check (weight >= 0 and weight <= 1.25),
  relationship_type text not null default 'likely' check (relationship_type in ('likely','adjacent','wildcard','visual','contextual','core')),
  rationale text not null default '', provenance text not null default 'curated',
  review_status text not null default 'approved' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(archetype_id, content_item_id)
);
create index if not exists content_items_domain_idx on public.content_items(domain_id);
create index if not exists archetype_influences_archetype_idx on public.archetype_influences(archetype_id);

alter table public.archetypes enable row level security;
alter table public.content_domains enable row level security;
alter table public.content_items enable row level security;
alter table public.archetype_influences enable row level security;
drop policy if exists "public active archetypes" on public.archetypes;
create policy "public active archetypes" on public.archetypes for select using (status = 'active');
drop policy if exists "public content domains" on public.content_domains;
create policy "public content domains" on public.content_domains for select using (true);
drop policy if exists "public approved content items" on public.content_items;
create policy "public approved content items" on public.content_items for select using (review_status = 'approved');
drop policy if exists "public approved archetype influences" on public.archetype_influences;
create policy "public approved archetype influences" on public.archetype_influences for select using (review_status = 'approved');
