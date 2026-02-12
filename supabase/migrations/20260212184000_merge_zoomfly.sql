-- 줌플라이 6 (트밀) 데이터를 (로드)에 합산 후 삭제
-- 합산: initial_distance_km = 0 + 63.91 = 63.91
UPDATE shoes
SET initial_distance_km = 63.91,
    name = '줌플라이 6',
    updated_at = now()
WHERE name = '줌플라이 6 (로드)';

-- 트밀 레코드에 연결된 running_records가 있으면 로드 레코드로 이관
UPDATE running_records
SET shoe_id = (SELECT id FROM shoes WHERE name = '줌플라이 6' LIMIT 1)
WHERE shoe_id = (SELECT id FROM shoes WHERE name = '줌플라이 6 (트밀)' LIMIT 1);

-- 트밀 레코드 삭제
DELETE FROM shoes WHERE name = '줌플라이 6 (트밀)';
