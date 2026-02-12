-- 신발 태그 (복수 선택 가능)
ALTER TABLE shoes ADD COLUMN tags TEXT[] DEFAULT ARRAY['로드']::TEXT[];

-- 기존 purpose 데이터를 tags로 이관
UPDATE shoes SET tags = ARRAY[purpose];
