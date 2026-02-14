-- ============================================================
-- SUPABASE SETUP — Run this in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================

-- 1. Create the whitelisted_emails table
create table if not exists public.whitelisted_emails (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  team_name text default '',
  active boolean default true,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security
alter table public.whitelisted_emails enable row level security;

-- 3. Allow anyone (with the anon key) to READ the whitelist
--    This lets the extension check if a user is allowed.
create policy "Allow read access for whitelist check"
  on public.whitelisted_emails
  for select
  using (true);

-- 4. Only authenticated service_role can INSERT/UPDATE/DELETE
--    (you manage the whitelist from the Supabase dashboard)
create policy "Only admins can modify whitelist"
  on public.whitelisted_emails
  for all
  using (auth.role() = 'service_role');

-- ============================================================
-- ADD YOUR FIRST WHITELISTED EMAILS:
-- Replace these with your real emails
-- ============================================================

insert into public.whitelisted_emails (email, team_name) values
  ('you@example.com', 'My Team'),
  ('teammate@example.com', 'My Team');

-- ============================================================
-- DONE! Now go to:
-- 1. Authentication > Providers > Enable Google (add OAuth credentials)
-- 2. Copy your Project URL and anon key from Settings > API
-- 3. Paste them into extension/sidepanel/auth/supabase-auth.js
-- ============================================================
