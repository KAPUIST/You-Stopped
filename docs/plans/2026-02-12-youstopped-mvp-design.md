# youStopped - Phase 1 MVP Design

## Overview

러닝 운동 기록을 미칠듯이 쉽게 입력하는 웹 대시보드.
기존 앱들(Garmin Connect, NRC, Strava)이 "보기 불편하다"는 클라이언트 피드백에서 출발.
엑셀의 깔끔한 데이터 관리 + AI 자동 입력의 편의성을 결합.

## Problem

- 클라이언트는 현재 엑셀로 2년치+ 러닝 데이터를 기록 중 (2024.05 ~ 현재)
- 매번 운동 후 엑셀을 열어서 15개+ 칸을 수동 입력해야 함
- 기존 러닝 앱들은 정보 과다, 월별 비교 어려움, 원하는 형태가 아님
- 엑셀은 보기엔 좋지만 입력이 번거로움 (특히 모바일에서)

## Solution

사진/스크린샷 한 장으로 자동 입력 + 3-4탭 스마트 폼 = 엑셀 15칸 입력을 대체

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| AI Vision | Gemini 2.0 Flash |
| Deploy | Vercel |

### Why This Stack

- **Next.js + Supabase + Vercel**: 가장 빠른 MVP 개발 속도. 인프라 관리 불필요
- **Gemini 2.0 Flash**: 무료 티어 (분당 15회, 일일 1500회)로 개인 클라이언트 충분. 비용 ~0
- **Supabase Storage**: 스크린샷 원본 보관용

## Data Model

### WorkoutSession (운동 세션)

```
id: uuid (PK)
user_id: uuid (FK -> auth.users)
date: date
exercise_type: enum ('treadmill' | 'track' | 'road' | 'park')
total_distance_km: decimal
total_duration: interval
shoe_id: uuid? (FK -> shoes)
note: text?
image_url: text? (업로드한 스크린샷 URL)
created_at: timestamp
updated_at: timestamp
```

### WorkoutSegment (운동 구간)

```
id: uuid (PK)
session_id: uuid (FK -> workout_sessions)
segment_type: enum ('warmup' | 'main' | 'cooldown' | 'interval')
distance_km: decimal
duration: interval
pace_kmh: decimal? (트레드밀용 - km/hr)
pace_minkm: text? (러닝용 - min/km, e.g. "5:21")
cadence: integer?
avg_heart_rate: integer?
note: text?
sort_order: integer
```

### Shoe (신발)

```
id: uuid (PK)
user_id: uuid (FK -> auth.users)
name: text (e.g. "페가수스 41", "알파3")
purchase_date: date?
road_distance_km: decimal (default 0)
treadmill_distance_km: decimal (default 0)
status: enum ('active' | 'retired')
created_at: timestamp
```

### PersonalRecord (개인기록) - Phase 2

```
id: uuid (PK)
user_id: uuid (FK -> auth.users)
distance_category: enum ('1km' | '3km' | '5km' | '10k' | 'half' | 'full')
record_time: interval
pace: text
date: date
session_id: uuid? (FK -> workout_sessions)
```

## Phase 1 Features

### F1: 사진 자동 인식 (핵심 기능)

**Flow:**
1. 사용자가 워치앱/트레드밀 화면 스크린샷 업로드
2. 이미지를 Supabase Storage에 저장
3. Gemini 2.0 Flash Vision API로 전송
4. Gemini가 구조화된 JSON 반환:
   ```json
   {
     "distance_km": 10.2,
     "duration": "1:06:46",
     "pace": "11.2",
     "cadence": 167,
     "avg_heart_rate": 131,
     "exercise_type": "treadmill"
   }
   ```
5. 추출 결과를 입력 폼에 자동 채움
6. 사용자가 확인/수정 후 저장

**Gemini Prompt 전략:**
- 시스템 프롬프트에 추출할 필드 명시
- 트레드밀 vs 러닝 워치 구분 지시
- 확신도 낮은 필드는 null 반환하도록 지시

### F2: 스마트 입력 폼

**Step 1: 운동 종류 선택** (큰 버튼 4개)
- 트레드밀 | 트랙 | 공단(로드) | 기타

**Step 2: 핵심 데이터 입력**
- 거리 (km) - 숫자 입력
- 시간 (HH:MM:SS) - 시간 피커
- 페이스 자동 계산 (거리 + 시간에서)
  - 트레드밀: km/hr로 표시
  - 러닝: min/km로 표시

**Step 3: 선택 데이터**
- 케이던스
- 평균 심박
- 신발 선택 (현재 active 신발 목록)
- 비고 (자유 텍스트 + 빠른 태그)
  - 빠른 태그: 인터벌, 빌드업, 회복조깅, 지속주, TT, 웜업, 쿨다운

**Step 4: 구간 분리 (선택)**
- "구간 추가" 버튼으로 웜업/본운동/쿨다운 분리
- 대부분의 경우 구간 분리 없이 단일 세션으로 기록

### F3: 기록 리스트 (최소한의 조회)

- 최근 기록 리스트 (날짜 역순)
- 각 항목: 날짜, 운동방법, 거리, 시간, 페이스 표시
- 클릭 시 상세 보기 (구간 정보, 비고, 원본 이미지)
- 수정/삭제 기능
- 월별 필터

### F4: 신발 관리

- 신발 추가: 이름, 구매일
- 운동 기록 시 신발 선택 → 자동 마일리지 누적 (로드/트밀 분리)
- 신발 목록에서 각 신발별 누적 거리 표시
- 은퇴 처리

### F5: 엑셀 데이터 임포트 (1회성)

- 기존 엑셀 파일 업로드
- 시트별 전용 파서 (2024용, 2025-2026용)
  - 2024: 18열, 신발 트래킹 없음, 일부 데이터 누락
  - 2025-2026: 30열, 신발 트래킹, 개인기록 포함
- DB 스키마는 2026(최신) 기준, 이전 데이터의 빈 필드는 null
- 임포트 전 미리보기 → 확인 → 저장
- openpyxl 기반 프로그래밍 파싱 (AI 불필요, 100% 정확)

## Phase 2 Features (이후)

- 대시보드/차트 설계 (클라이언트 피드백 기반)
- 월별 요약 (총 거리, 총 시간, 횟수)
- 개인기록 자동 감지 (새 기록 달성 시 알림)
- 페이스/거리 추이 차트
- 엑셀 내보내기
- 신발 마일리지 시각화

## Key Design Decisions

1. **AI Vision은 Gemini Flash** - 무료 티어로 충분, 비용 0
2. **사진 인식은 보조 수단** - 스마트 폼이 기본, 사진은 자동 채움용
3. **트레드밀/러닝 페이스 분리** - 트레드밀은 km/hr, 러닝은 min/km (엑셀과 동일)
4. **조회 화면은 MVP에서 최소화** - 입력 자동화 검증 후 피드백 기반 설계
5. **엑셀 임포트는 코드 파싱** - AI 불필요, 셀 좌표 기반 100% 정확
6. **세션 > 구간 구조** - 웜업/본운동/쿨다운을 깔끔하게 분리

## Success Criteria

- 클라이언트가 스크린샷 1장으로 운동 기록을 30초 이내에 완료
- 스마트 폼으로 수동 입력 시 1분 이내 (엑셀 대비 70%+ 시간 절약)
- 기존 2년치 데이터 무손실 임포트
