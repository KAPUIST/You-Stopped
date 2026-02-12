-- running_records 테이블 생성
CREATE TABLE running_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  exercise_type TEXT NOT NULL,
  distance_km NUMERIC(6,3),
  duration INTERVAL,
  pace_kmh NUMERIC(4,1),
  pace_minkm TEXT,
  cadence INTEGER,
  avg_heart_rate INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE running_records ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view own records"
  ON running_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON running_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON running_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON running_records FOR DELETE
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_running_records_user_date
  ON running_records (user_id, date DESC);
