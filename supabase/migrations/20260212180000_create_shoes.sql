-- shoes 테이블 생성
CREATE TABLE shoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  purpose TEXT NOT NULL DEFAULT '로드',
  status TEXT NOT NULL DEFAULT 'active',
  purchased_at DATE,
  initial_distance_km NUMERIC(7,2) DEFAULT 0,
  max_distance_km NUMERIC(7,2) DEFAULT 800,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE shoes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: running_records와 동일 패턴 (user_id 기반 CRUD)
CREATE POLICY "Users can view own shoes"
  ON shoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shoes"
  ON shoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shoes"
  ON shoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shoes"
  ON shoes FOR DELETE
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_shoes_user_status ON shoes (user_id, status);
