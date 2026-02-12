-- running_records에 shoe_id 컬럼 추가
ALTER TABLE running_records ADD COLUMN shoe_id UUID REFERENCES shoes(id) ON DELETE SET NULL;

-- 부분 인덱스: shoe_id가 있는 레코드만 인덱싱
CREATE INDEX idx_running_records_shoe ON running_records (shoe_id) WHERE shoe_id IS NOT NULL;
