-- Moti Renew: Supabase schema
-- Run this file in Supabase Dashboard > SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  company_name text not null default '',
  default_currency text not null default 'INR',
  language text not null default 'en',
  theme text not null default 'light',
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.payments (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.activities enable row level security;

drop policy if exists "Users can manage their own profile" on public.profiles;
create policy "Users can manage their own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can manage their own subscriptions" on public.subscriptions;
create policy "Users can manage their own subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own payments" on public.payments;
create policy "Users can manage their own payments" on public.payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own activities" on public.activities;
create policy "Users can manage their own activities" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Allow authenticated clients to access the tables; RLS still limits rows to auth.uid().
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
