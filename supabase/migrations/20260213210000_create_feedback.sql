-- 피드백 테이블
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  email text,
  created_at timestamptz default now()
);

-- 누구나 피드백 작성 가능 (비로그인 포함)
alter table feedback enable row level security;

create policy "Anyone can insert feedback"
  on feedback for insert
  with check (true);

-- 본인 피드백만 조회 불가 (관리자만 Supabase 대시보드에서 확인)
create policy "No public read"
  on feedback for select
  using (false);
