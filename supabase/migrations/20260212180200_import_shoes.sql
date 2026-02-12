-- 병민님의 엑셀 신발 데이터 초기 삽입
-- user_id는 현재 유일한 사용자의 ID를 서브쿼리로 가져옴
INSERT INTO shoes (user_id, name, brand, purpose, status, purchased_at, initial_distance_km, max_distance_km)
SELECT
  id AS user_id,
  v.name, v.brand, v.purpose, v.status, v.purchased_at, v.initial_distance_km, v.max_distance_km
FROM auth.users
CROSS JOIN (VALUES
  ('페가수스 41',      'Nike', '로드',     'active', NULL::DATE,       553.98, 800),
  ('알파플라이 3',     'Nike', '로드',     'active', '2025-02-01'::DATE, 0,    800),
  ('프로 4',           'Nike', '로드',     'active', '2025-11-11'::DATE, 0,    800),
  ('베이퍼플라이 4',   'Nike', '레이스',   'active', NULL::DATE,         0,    400),
  ('줌플라이 6 (로드)', 'Nike', '로드',     'active', '2024-11-01'::DATE, 0,    800),
  ('줌플라이 6 (트밀)', 'Nike', '트레드밀', 'active', '2024-11-01'::DATE, 63.91, 800)
) AS v(name, brand, purpose, status, purchased_at, initial_distance_km, max_distance_km)
LIMIT 6;
