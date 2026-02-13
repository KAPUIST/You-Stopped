-- ============================================================
-- Strava 연동을 위한 스키마 확장
-- ============================================================

-- 1. strava_connections: OAuth 토큰 저장
CREATE TABLE strava_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_athlete_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(strava_athlete_id)
);

ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strava connection"
  ON strava_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strava connection"
  ON strava_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strava connection"
  ON strava_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strava connection"
  ON strava_connections FOR DELETE USING (auth.uid() = user_id);

-- 2. running_records에 source 관련 컬럼 추가
ALTER TABLE running_records
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS max_heart_rate INTEGER,
  ADD COLUMN IF NOT EXISTS calories NUMERIC(7,1),
  ADD COLUMN IF NOT EXISTS elevation_gain NUMERIC(7,1),
  ADD COLUMN IF NOT EXISTS suffer_score INTEGER,
  ADD COLUMN IF NOT EXISTS max_speed NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS elapsed_time INTERVAL,
  ADD COLUMN IF NOT EXISTS avg_temp NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS map_polyline TEXT;

-- source + source_id 유니크 (같은 Strava 활동 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_running_records_source
  ON running_records(user_id, source, source_id)
  WHERE source_id IS NOT NULL;

-- 3. activity_splits: km별 구간 기록
CREATE TABLE activity_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES running_records(id) ON DELETE CASCADE,
  split_num INTEGER NOT NULL,
  distance_m NUMERIC(8,1) NOT NULL,
  elapsed_time INTEGER NOT NULL,
  moving_time INTEGER,
  avg_speed NUMERIC(5,3),
  avg_heartrate NUMERIC(5,1),
  elevation_diff NUMERIC(6,1),
  pace_zone INTEGER,
  UNIQUE(record_id, split_num)
);

ALTER TABLE activity_splits ENABLE ROW LEVEL SECURITY;

-- splits는 record의 소유자만 접근 가능
CREATE POLICY "Users can view own splits"
  ON activity_splits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM running_records r
    WHERE r.id = activity_splits.record_id AND r.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own splits"
  ON activity_splits FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM running_records r
    WHERE r.id = activity_splits.record_id AND r.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own splits"
  ON activity_splits FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM running_records r
    WHERE r.id = activity_splits.record_id AND r.user_id = auth.uid()
  ));

CREATE INDEX idx_activity_splits_record ON activity_splits(record_id);

-- 4. activity_best_efforts: PR 추적
CREATE TABLE activity_best_efforts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES running_records(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  distance NUMERIC(8,1) NOT NULL,
  elapsed_time INTEGER NOT NULL,
  moving_time INTEGER,
  pr_rank INTEGER,
  UNIQUE(record_id, name)
);

ALTER TABLE activity_best_efforts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own best efforts"
  ON activity_best_efforts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM running_records r
    WHERE r.id = activity_best_efforts.record_id AND r.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own best efforts"
  ON activity_best_efforts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM running_records r
    WHERE r.id = activity_best_efforts.record_id AND r.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own best efforts"
  ON activity_best_efforts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM running_records r
    WHERE r.id = activity_best_efforts.record_id AND r.user_id = auth.uid()
  ));

CREATE INDEX idx_activity_best_efforts_record ON activity_best_efforts(record_id);
