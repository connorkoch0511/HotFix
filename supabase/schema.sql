-- ============================================================
-- HotFix IT Helpdesk — Supabase Schema
-- Run this in the Supabase SQL editor for your project
-- ============================================================

-- Profiles (extends auth.users)
create table if not exists profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  email      text not null,
  full_name  text not null default '',
  role       text not null default 'end_user'
               check (role in ('admin', 'technician', 'end_user')),
  department text,
  created_at timestamptz not null default now()
);

-- Tickets
create table if not exists tickets (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null,
  category    text not null
                check (category in ('hardware', 'software', 'network', 'access', 'other')),
  priority    text not null default 'medium'
                check (priority in ('critical', 'high', 'medium', 'low')),
  status      text not null default 'open'
                check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_by  uuid references profiles(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- Comments / notes
create table if not exists ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid references tickets(id) on delete cascade not null,
  author_id   uuid references profiles(id) on delete set null,
  body        text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Audit log — every field change recorded
create table if not exists ticket_audit (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid references tickets(id) on delete cascade not null,
  user_id     uuid references profiles(id) on delete set null,
  action      text not null,
  changes     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ---- Triggers ------------------------------------------------

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at current on ticket changes
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tickets_updated_at on tickets;
create trigger tickets_updated_at
  before update on tickets
  for each row execute procedure update_updated_at();

-- ---- Row Level Security --------------------------------------

alter table profiles       enable row level security;
alter table tickets        enable row level security;
alter table ticket_comments enable row level security;
alter table ticket_audit   enable row level security;

-- Profiles: authenticated users can read all (needed for assignment dropdowns)
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update to authenticated using (auth.uid() = id);

-- Tickets: end_users see their own; admins/technicians see all
drop policy if exists "tickets_select" on tickets;
create policy "tickets_select" on tickets
  for select to authenticated using (
    created_by = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'technician'))
  );

drop policy if exists "tickets_insert" on tickets;
create policy "tickets_insert" on tickets
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "tickets_update" on tickets;
create policy "tickets_update" on tickets
  for update to authenticated using (
    created_by = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'technician'))
  );

-- Comments: internal notes visible only to staff
drop policy if exists "comments_select" on ticket_comments;
create policy "comments_select" on ticket_comments
  for select to authenticated using (
    (not is_internal) or
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'technician'))
  );

drop policy if exists "comments_insert" on ticket_comments;
create policy "comments_insert" on ticket_comments
  for insert to authenticated with check (author_id = auth.uid());

-- Audit: visible to ticket creator and staff
drop policy if exists "audit_select" on ticket_audit;
create policy "audit_select" on ticket_audit
  for select to authenticated using (
    exists (
      select 1 from tickets t
      where t.id = ticket_id and (
        t.created_by = auth.uid() or
        exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'technician'))
      )
    )
  );

-- Service role writes audit entries (bypasses RLS), so no insert policy needed for anon/authenticated
