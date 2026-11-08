-- PoiWallet: run once in Supabase → SQL Editor.
-- One row per user holds that user's wallet (cards, coupons, deletions) as JSON.

create table if not exists public.wallets (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

-- Each signed-in user can read and write only their own row.
create policy "wallet_select_own" on public.wallets for select using (auth.uid() = user_id);
create policy "wallet_insert_own" on public.wallets for insert with check (auth.uid() = user_id);
create policy "wallet_update_own" on public.wallets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wallet_delete_own" on public.wallets for delete using (auth.uid() = user_id);

-- Lets a user delete their own account (required by the App Store, Google Play and GDPR).
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
