-- ================================================
-- exercise_type 정규화 + 태그 시스템 마이그레이션
-- ================================================
-- 1. tags TEXT[] 컬럼 추가
-- 2. 대회 레코드 → tags=['대회'], exercise_type='로드'
-- 3. 장소 기반 exercise_type → '로드'로 정규화
-- 4. notes에 원래 exercise_type 보존
-- 5. CHECK constraint 추가

-- Step 1: tags 컬럼 추가
ALTER TABLE running_records
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 2: 대회 레코드 — notes에 대회명 보존 + 태그 설정 + 유형 정규화
UPDATE running_records
SET
  notes = CASE
    WHEN notes IS NOT NULL AND notes != '' THEN '[' || exercise_type || '] ' || notes
    ELSE '[' || exercise_type || ']'
  END,
  tags = ARRAY['대회'],
  exercise_type = '로드'
WHERE exercise_type IN ('대구마라톤', '춘천마라톤', '청원생명쌀마라톤', '청원생명쌀');

-- Step 3: 장소 기반 exercise_type 정규화 — notes에 장소명 보존
UPDATE running_records
SET
  notes = CASE
    WHEN notes IS NOT NULL AND notes != '' THEN '[' || exercise_type || '] ' || notes
    ELSE '[' || exercise_type || ']'
  END,
  exercise_type = '로드'
WHERE exercise_type IN ('공단', '야외(호수공원)', '야외(율량천)', '성성호수공원')
  AND exercise_type != '로드';

-- Step 4: '로드' 이미 맞는 건 그대로 (no-op)
-- 트랙, 트레드밀도 이미 맞음

-- Step 5: CHECK constraint 추가
ALTER TABLE running_records
ADD CONSTRAINT chk_exercise_type
CHECK (exercise_type IN ('로드', '트레드밀', '트랙', '트레일'));
