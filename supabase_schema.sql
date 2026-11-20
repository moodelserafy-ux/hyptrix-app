-- =============================================================================
-- Neelyo Cinema Tycoon — Complete Clean Supabase Production Schema (7 Tables)
-- Drops ALL legacy Hyptrix & old tables cleanly, then creates fresh Neelyo tables.
-- Run this entire script once inside Supabase SQL Editor.
-- =============================================================================

-- 0. Clean Slate: Remove ALL old Hyptrix & legacy tables completely
drop table if exists public.hyptrix_ledger_transactions cascade;
drop table if exists public.hyptrix_studio_wallets cascade;
drop table if exists public.hyptrix_cloud_saves cascade;
drop table if exists public.hyptrix_leaderboard cascade;

drop table if exists public.neelyo_ledger_transactions cascade;
drop table if exists public.neelyo_studio_wallets cascade;
drop table if exists public.neelyo_cloud_saves cascade;
drop table if exists public.neelyo_leaderboard cascade;
drop table if exists public.world_events_pool cascade;
drop table if exists public.referrals cascade;
drop table if exists public.weekly_challenges cascade;

-- 1. Global Verified Players Leaderboard (Unique by studio_instance_id to avoid name collisions)
create table public.neelyo_leaderboard (
  studio_instance_id text primary key,
  studio_name text not null,
  ceo_name text not null,
  market_value bigint not null default 75000000,
  cash bigint not null default 75000000,
  reputation integer not null default 50,
  released_count integer not null default 0,
  total_awards integer not null default 0,
  owned_assets_count integer not null default 0,
  ledger_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create index idx_neelyo_leaderboard_market_value
  on public.neelyo_leaderboard (market_value desc);

-- 2. Cloud Saves (Supports automatic Telegram User ID saves, manual sync codes, AND optional Email saves)
create table public.neelyo_cloud_saves (
  sync_code text primary key,
  telegram_user_id text unique,
  user_email text unique,
  studio_instance_id text,
  studio_name text not null default 'Neelyo Studio',
  ceo_name text not null default 'المنتج',
  market_value bigint not null default 75000000,
  game_day integer not null default 1,
  vip_coins integer not null default 0,
  vip_pass_expires_at bigint,
  verified_cash bigint not null default 75000000,
  owned_assets jsonb not null default '[]'::jsonb,
  ledger_signature text not null default '',
  state_json jsonb not null default '{}'::jsonb,
  save_data text,
  updated_at timestamptz not null default now()
);

create index idx_neelyo_cloud_saves_telegram_uid
  on public.neelyo_cloud_saves (telegram_user_id);

create index idx_neelyo_cloud_saves_email
  on public.neelyo_cloud_saves (user_email);

-- 3. Authoritative Server Studio Wallets (Anti-Cheat Vault backing /api/verify-ledger & /api/leaderboard)
create table public.neelyo_studio_wallets (
  studio_instance_id text primary key,
  studio_name text not null default 'Neelyo Studio',
  ceo_name text not null default 'المدير التنفيذي',
  user_email text,
  verified_cash bigint not null default 75000000,
  verified_market_value bigint not null default 110000000,
  reputation integer not null default 62,
  owned_assets jsonb not null default '[]'::jsonb,
  ledger_signature text not null default '',
  updated_at timestamptz not null default now()
);

create index idx_neelyo_wallets_updated_at
  on public.neelyo_studio_wallets (updated_at desc);

-- 4. Financial Ledger Audit Transactions (Append-only server audit log for anti-cheat integrity)
create table public.neelyo_ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  studio_instance_id text not null,
  studio_name text not null default 'Neelyo Studio',
  transaction_type text not null,
  amount_delta bigint not null default 0,
  balance_after bigint not null default 75000000,
  item_id text,
  item_label text,
  tamper_flagged boolean not null default false,
  ledger_signature text not null default '',
  created_at timestamptz not null default now()
);

create index idx_neelyo_ledger_tx_studio
  on public.neelyo_ledger_transactions (studio_instance_id, created_at desc);

-- 5. Shared World Events Pool (Refreshed every 12h via Cron or lazy TTL — 0 Groq cost per player!)
create table public.world_events_pool (
  market_id text primary key, -- 'egypt' | 'saudi'
  payload_json jsonb not null,
  refreshed_at timestamptz not null default now()
);

-- 6. Telegram & Web Viral Referrals (Anti-self-referral & anti-duplicate)
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_studio_id text not null,
  invitee_studio_id text not null unique,
  reward_type text not null default 'cash', -- 'cash' | 'star_lock'
  reward_amount bigint not null default 15000000,
  created_at timestamptz not null default now()
);

create index idx_referrals_referrer
  on public.referrals (referrer_studio_id);

-- 7. Weekly Global Challenge Entries (e.g., Highest profit Horror film under 40M budget)
create table public.weekly_challenges (
  id text primary key, -- '<week_key>__<studio_instance_id>'
  week_key text not null,
  studio_instance_id text not null,
  studio_name text not null,
  ceo_name text not null,
  project_title text not null,
  world_market text not null default 'egypt',
  score_value bigint not null default 0,
  budget_used bigint not null default 0,
  critic_score numeric(3,1) not null default 7.0,
  updated_at timestamptz not null default now()
);

create index idx_weekly_challenges_rank
  on public.weekly_challenges (week_key, score_value desc);
