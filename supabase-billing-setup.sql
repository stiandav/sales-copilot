-- ============================================================
-- SUPABASE BILLING SETUP — Run this in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================
-- Run this AFTER supabase-setup.sql (which creates whitelisted_emails)
-- ============================================================

-- 1. Create subscriptions table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  plan text default 'trial' check (plan in ('trial', 'monthly', 'annual')),
  status text default 'active' check (status in ('active', 'canceled', 'past_due', 'expired')),
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_start timestamptz default now(),
  trial_end timestamptz default (now() + interval '7 days'),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Unique constraint — one subscription per user
create unique index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_email on public.subscriptions(email);

-- 3. Enable Row Level Security
alter table public.subscriptions enable row level security;

-- 4. Users can read their own subscription
create policy "Users can read own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- 5. Auto-create a trial subscription when a new user signs up
--    Uses a Postgres trigger on auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, email, plan, status, trial_start, trial_end)
  values (
    new.id,
    new.email,
    'trial',
    'active',
    now(),
    now() + interval '7 days'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Service role can manage subscriptions (for Stripe webhooks)
create policy "Service role can manage subscriptions"
  on public.subscriptions
  for all
  using (auth.role() = 'service_role');

-- 7. Allow insert for the trigger function (security definer)
create policy "Allow trigger to create subscription"
  on public.subscriptions
  for insert
  with check (true);

-- ============================================================
-- STRIPE WEBHOOK HANDLER (Supabase Edge Function)
-- ============================================================
-- Deploy this as a Supabase Edge Function named "stripe-webhook"
-- See: supabase-stripe-webhook.js in the project root
-- ============================================================

-- ============================================================
-- PRICING STRUCTURE
-- ============================================================
-- Create these products in Stripe Dashboard (dashboard.stripe.com):
--
-- Product: "Cold Call AI - Monthly"
--   Price: $79/month (recurring)
--   Price ID: price_monthly_xxx (copy this into the extension config)
--
-- Product: "Cold Call AI - Annual"
--   Price: $588/year ($49/month, save 38%)
--   Price ID: price_annual_xxx (copy this into the extension config)
--
-- Both should have:
--   - 7-day free trial built into Stripe (trial_period_days: 7)
--   - Or use the extension's own trial system
-- ============================================================

-- ============================================================
-- EXISTING USERS — Backfill trial subscriptions
-- ============================================================
-- Run this once to create trial entries for any existing users:
--
-- insert into public.subscriptions (user_id, email, plan, status, trial_start, trial_end)
-- select id, email, 'trial', 'active', created_at, created_at + interval '7 days'
-- from auth.users
-- where id not in (select user_id from public.subscriptions where user_id is not null)
-- on conflict (user_id) do nothing;
-- ============================================================
