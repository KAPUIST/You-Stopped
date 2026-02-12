-- 1. running_records 테이블 생성
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

-- 2. RLS 활성화
ALTER TABLE running_records ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책: 본인 데이터만 조회
CREATE POLICY "Users can view own records"
  ON running_records FOR SELECT
  USING (auth.uid() = user_id);

-- 4. RLS 정책: 본인 데이터만 삽입
CREATE POLICY "Users can insert own records"
  ON running_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. RLS 정책: 본인 데이터만 수정
CREATE POLICY "Users can update own records"
  ON running_records FOR UPDATE
  USING (auth.uid() = user_id);

-- 6. RLS 정책: 본인 데이터만 삭제
CREATE POLICY "Users can delete own records"
  ON running_records FOR DELETE
  USING (auth.uid() = user_id);

-- 7. 인덱스: 유저별 날짜순 조회 최적화
CREATE INDEX idx_running_records_user_date
  ON running_records (user_id, date DESC);
