-- Execute in the Supabase SQL editor. Local game saves are intentionally NOT stored here.
create table if not exists public.studio_leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  studio_name text not null check (char_length(studio_name) <= 70),
  market text not null default 'egypt' check (market in ('egypt','gulf','europe','hollywood')),
  net_worth bigint not null default 0 check (net_worth >= 0),
  reputation integer not null default 0 check (reputation between 0 and 100),
  updated_at timestamptz not null default now()
);
create index if not exists studio_leaderboard_net_worth_idx on public.studio_leaderboard (net_worth desc);

create table if not exists public.vip_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.vip_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null default 'none',
  status text not null default 'inactive',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.studio_leaderboard enable row level security;
alter table public.vip_wallets enable row level security;
alter table public.vip_subscriptions enable row level security;

drop policy if exists "Leaderboard is publicly readable" on public.studio_leaderboard;
create policy "Leaderboard is publicly readable" on public.studio_leaderboard for select using (true);
drop policy if exists "Users can view own vip wallet" on public.vip_wallets;
create policy "Users can view own vip wallet" on public.vip_wallets for select using (auth.uid() = user_id);
drop policy if exists "Users can view own vip subscription" on public.vip_subscriptions;
create policy "Users can view own vip subscription" on public.vip_subscriptions for select using (auth.uid() = user_id);

-- No client insert/update/delete policies for wallet/subscriptions. Only trusted server processes
-- (service role, payment webhook, or admin operation) may change balances or entitlements.


create table if not exists public.ad_reward_events (
  event_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  placement text not null,
  created_at timestamptz not null default now()
);
create index if not exists ad_reward_events_user_placement_idx on public.ad_reward_events(user_id, placement, created_at desc);
alter table public.ad_reward_events enable row level security;
-- No client policies: only the server-side service role can record verified ad receipts.


-- Sequential five-ad VIP pass. Progress resets after a completed pass or a 24-hour gap.
create table if not exists public.vip_ad_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress integer not null default 0 check (progress between 0 and 4),
  updated_at timestamptz not null default now()
);
alter table public.vip_ad_progress enable row level security;
-- Progress is server-managed; clients read it only through the authenticated API.

create or replace function public.apply_rewarded_ad_event(
  p_user_id uuid,
  p_event_id text,
  p_placement text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_progress integer;
  next_progress integer;
  current_updated_at timestamptz;
  expiry timestamptz;
begin
  insert into public.ad_reward_events(event_id, user_id, placement)
  values (p_event_id, p_user_id, p_placement)
  on conflict (event_id) do nothing;
  if not found then
    return jsonb_build_object('duplicate', true, 'progress', 0, 'active', false);
  end if;

  if p_placement <> 'vip_pass' then
    return jsonb_build_object('duplicate', false, 'progress', 0, 'active', false);
  end if;

  insert into public.vip_ad_progress(user_id, progress, updated_at)
  values (p_user_id, 0, now())
  on conflict (user_id) do nothing;

  select progress, updated_at into current_progress, current_updated_at
  from public.vip_ad_progress where user_id = p_user_id for update;
  if current_updated_at < now() - interval '24 hours' then
    current_progress := 0;
  end if;
  next_progress := current_progress + 1;

  if next_progress >= 5 then
    expiry := now() + interval '24 hours';
    update public.vip_ad_progress set progress = 0, updated_at = now() where user_id = p_user_id;
    insert into public.vip_subscriptions(user_id, plan_code, status, expires_at, updated_at)
    values (p_user_id, 'rewarded_24h', 'active', expiry, now())
    on conflict (user_id) do update set plan_code = excluded.plan_code, status = excluded.status,
      expires_at = excluded.expires_at, updated_at = excluded.updated_at;
    return jsonb_build_object('duplicate', false, 'progress', 5, 'active', true, 'expires_at', expiry);
  end if;

  update public.vip_ad_progress set progress = next_progress, updated_at = now() where user_id = p_user_id;
  return jsonb_build_object('duplicate', false, 'progress', next_progress, 'active', false);
end;
$$;

revoke all on function public.apply_rewarded_ad_event(uuid, text, text) from public, anon, authenticated;
grant execute on function public.apply_rewarded_ad_event(uuid, text, text) to service_role;
