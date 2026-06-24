-- 구독 상태. user_id는 auth.users(id) 참조.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'none' check (status in ('active', 'canceled', 'past_due', 'none')),
  current_period_end timestamptz,
  toss_billing_key text,
  toss_customer_key text,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- 본인 구독만 조회
create policy "own subscription readable"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- 쓰기는 서버(서비스 롤)만. 클라이언트 직접 쓰기 정책은 두지 않는다.
