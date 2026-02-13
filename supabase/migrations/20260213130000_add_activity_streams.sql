-- ============================================================
-- Activity Streams: Strava 초단위 연속 데이터 저장
-- heartrate, altitude, velocity, cadence, latlng 등
-- ============================================================

CREATE TABLE activity_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES running_records(id) ON DELETE CASCADE,
  stream_data JSONB NOT NULL,
  -- stream_data 구조:
  -- {
  --   "time": [0, 1, 2, ...],          -- 초 (시작부터)
  --   "distance": [0, 5.2, 10.1, ...], -- 미터 (시작부터)
  --   "heartrate": [120, 121, ...],     -- bpm
  --   "altitude": [50.2, 50.3, ...],    -- 미터
  --   "velocity_smooth": [3.1, ...],    -- m/s
  --   "cadence": [170, 172, ...],       -- spm
  --   "grade_smooth": [0.1, -0.2, ...], -- %
  --   "latlng": [[37.5, 127.0], ...]    -- [lat, lng]
  -- }
  data_points INTEGER NOT NULL DEFAULT 0,  -- 다운샘플링 후 데이터 포인트 수
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(record_id)
);

ALTER TABLE activity_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streams"
  ON activity_streams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM running_records r
    WHERE r.id = activity_streams.record_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own streams"
  ON activity_streams FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM running_records r
    WHERE r.id = activity_streams.record_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own streams"
  ON activity_streams FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM running_records r
    WHERE r.id = activity_streams.record_id AND r.user_id = auth.uid()
  ));

CREATE INDEX idx_activity_streams_record ON activity_streams(record_id);
