-- Supabase schema for 書類サポートSaaS
-- Run this in the Supabase SQL Editor

-- profiles: ユーザープロフィール（auth.usersと1:1）
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  plan text not null default 'free', -- free | standard | season
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- usage_logs: API利用ログ（月次カウント用）
create table if not exists public.usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- RLS有効化
alter table public.profiles enable row level security;
alter table public.usage_logs enable row level security;

-- プロフィールはサービスロールのみ操作（クライアントからの直接操作を禁止）
create policy "service_role_profiles" on public.profiles using (true) with check (true);
create policy "service_role_usage" on public.usage_logs using (true) with check (true);

-- サインアップ時にprofileを自動作成するトリガー
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
