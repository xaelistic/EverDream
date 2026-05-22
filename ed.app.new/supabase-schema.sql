-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Create dreams table
create table public.dreams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  category text not null default 'uncategorized',
  themes text[] not null default '{}',
  emotion text not null default 'neutral',
  symbols text[] not null default '{}',
  narrative text not null,
  nugget text not null,
  interpretation jsonb not null default '{}',
  sleep_data jsonb,
  generated_image jsonb,
  watermark jsonb,
  asset_metadata jsonb,
  context jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dreams enable row level security;

create policy "Users can view own dreams"
  on public.dreams for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own dreams"
  on public.dreams for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own dreams"
  on public.dreams for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own dreams"
  on public.dreams for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create sleep_logs table
create table public.sleep_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bedtime timestamptz not null,
  wake_time timestamptz not null,
  sleep_duration integer not null,
  estimated_rem integer,
  movement_score integer,
  quality integer,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

alter table public.sleep_logs enable row level security;

create policy "Users can view own sleep logs"
  on public.sleep_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own sleep logs"
  on public.sleep_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Create settings table
create table public.settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  alarm_time text not null default '07:00',
  alarm_enabled boolean not null default true,
  music_preference text not null default 'peaceful',
  circadian_goal text not null default 'better_dreams',
  notifications_enabled boolean not null default true,
  wearable_sync boolean not null default false,
  image_generation boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "Users can view own settings"
  on public.settings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.settings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.settings for update
  to authenticated
  using (auth.uid() = user_id);

-- Create updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add updated_at triggers
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger dreams_set_updated_at
  before update on public.dreams
  for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  
  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
