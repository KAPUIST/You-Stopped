-- 신발 거리 로그 테이블
CREATE TABLE shoe_distance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shoe_id UUID REFERENCES shoes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  distance_km NUMERIC(7,2) NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT '로드',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shoe_distance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shoe logs"
  ON shoe_distance_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shoe logs"
  ON shoe_distance_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shoe logs"
  ON shoe_distance_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_shoe_distance_logs_shoe ON shoe_distance_logs (shoe_id);

-- ── 기존 데이터 이관 ──

-- 줌플라이 6: 로드 553.98 + 트밀 63.91 = 617.89
INSERT INTO shoe_distance_logs (shoe_id, user_id, distance_km, exercise_type, date, notes)
SELECT id, user_id, 553.98, '로드', '2024-11-01', '엑셀 데이터 이관'
FROM shoes WHERE name = '줌플라이 6';

INSERT INTO shoe_distance_logs (shoe_id, user_id, distance_km, exercise_type, date, notes)
SELECT id, user_id, 63.91, '트레드밀', '2024-11-01', '엑셀 데이터 이관'
FROM shoes WHERE name = '줌플라이 6';

-- 페가수스 41: 553.98은 원래 줌플라이 6 데이터였으므로 제거
-- (페가수스 41 실제 누적거리는 사용자가 직접 추가 예정)

-- 모든 initial_distance_km 리셋 (로그로 이관 완료)
UPDATE shoes SET initial_distance_km = 0;
