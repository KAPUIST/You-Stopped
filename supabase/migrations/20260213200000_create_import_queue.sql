-- ═══ Import Queue System ═══
-- DB 기반 큐로 Strava API rate limit을 안전하게 관리

-- ─── import_jobs: 개별 활동 임포트 작업 ───
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_activity_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | done | error | cancelled
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE(user_id, strava_activity_id)
);

CREATE INDEX idx_import_jobs_status ON import_jobs(status, created_at);
CREATE INDEX idx_import_jobs_user ON import_jobs(user_id, status);

-- ─── rate_limit_state: Strava API 전역 rate limit 추적 (싱글톤) ───
CREATE TABLE rate_limit_state (
  id TEXT PRIMARY KEY DEFAULT 'global',
  requests_15min INTEGER DEFAULT 0,
  requests_daily INTEGER DEFAULT 0,
  window_reset_at TIMESTAMPTZ,
  day_reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO rate_limit_state (id, window_reset_at, day_reset_at)
VALUES (
  'global',
  now() + interval '15 minutes',
  (now() + interval '1 day')::date + interval '0 hours'
);

-- ─── RLS 정책 ───

-- import_jobs: 사용자 본인 것만 읽기 가능 (INSERT/UPDATE는 서버만)
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import jobs"
  ON import_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- rate_limit_state: 서버 전용 (service_role_key로만 접근)
ALTER TABLE rate_limit_state ENABLE ROW LEVEL SECURITY;
-- RLS 정책 없음 = 일반 사용자 접근 차단, service_role_key만 접근 가능
