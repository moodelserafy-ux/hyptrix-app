-- =============================================================================
-- Neelyo Cinema Tycoon — Supabase Production Schema
-- Run inside Supabase SQL Editor before public launch
-- =============================================================================

-- 1. Global Verified Players Leaderboard (Unique by studio_instance_id to avoid name collisions)
create table if not exists public.hyptrix_leaderboard (
  studio_instance_id text primary key,
  studio_name text not null,
  ceo_name text not null,
  market_value bigint not null default 75000000,
  cash bigint not null default 75000000,
  reputation integer not null default 50,
  released_count integer not null default 0,
  total_awards integer not null default 0,
  ledger_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_leaderboard_market_value
  on public.hyptrix_leaderboard (market_value desc);

-- 2. Cloud Saves (Supports manual sync codes AND automatic Telegram User ID cloud saves)
create table if not exists public.hyptrix_cloud_saves (
  sync_code text primary key,
  telegram_user_id text unique,
  studio_name text not null,
  ceo_name text not null,
  market_value bigint not null default 75000000,
  game_day integer not null default 1,
  state_json jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_cloud_saves_telegram_uid
  on public.hyptrix_cloud_saves (telegram_user_id);

-- 3. Shared World Events Pool (Refreshed every 12h via Cron or lazy TTL — 0 Groq cost per player!)
create table if not exists public.world_events_pool (
  market_id text primary key, -- 'egypt' | 'saudi'
  payload_json jsonb not null,
  refreshed_at timestamptz not null default now()
);

-- 4. Telegram & Web Viral Referrals (Anti-self-referral & anti-duplicate)
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_studio_id text not null,
  invitee_studio_id text not null unique,
  reward_type text not null default 'cash', -- 'cash' | 'star_lock'
  reward_amount bigint not null default 15000000,
  created_at timestamptz not null default now()
);

create index if not exists idx_referrals_referrer
  on public.referrals (referrer_studio_id);

-- 5. Weekly Global Challenge Entries (e.g., Highest profit Horror film under 40M budget)
create table if not exists public.weekly_challenges (
  id text primary key, -- '<week_key>__<studio_instance_id>'
  week_key text not null,
  studio_instance_id text not null,
  studio_name text not null,
  ceo_name text not null,
  project_title text not null,
  world_market text not null default 'egypt',
  score_value bigint not null default 0, -- net profit or metric
  budget_used bigint not null default 0,
  critic_score numeric(3,1) not null default 7.0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_weekly_challenges_rank
  on public.weekly_challenges (week_key, score_value desc);
