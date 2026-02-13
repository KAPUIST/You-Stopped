# 대시보드 컨벤션

## 구조

- `layout.tsx` — 사이드바 + Auth guard + 데이터 로딩 (DashboardContext 제공)
- `context.tsx` — 공유 Context (`RunningRecord` 타입, `useDashboard()`)
- `page.tsx` — 오버뷰 (Grafana 스타일, 기간 선택기)
- `records/page.tsx` — 기록 테이블 (연도 탭 + 월 칩 + 정렬)

## 데이터 흐름

1. `layout.tsx`에서 `supabase.from("running_records").select()` 1회 호출
2. `DashboardContext.Provider`로 하위 페이지에 `records` 배열 전달
3. 각 페이지에서 `useDashboard()`로 접근, 필요한 필터/집계는 `useMemo`로 처리

## RunningRecord 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `pace_minkm` | `string \| null` | `"5'44\""` 형식 (min/km) |
| `pace_kmh` | `number \| null` | km/h 속력 |
| `distance_km` | `number \| null` | 거리 |
| `duration` | `string \| null` | PostgreSQL interval → `"HH:MM:SS"` |
| `cadence` | `number \| null` | 케이던스 (spm) |
| `avg_heart_rate` | `number \| null` | 평균 심박 (bpm) |

## 페이스/속력 표시 규칙

- `pace_minkm` 있으면: 페이스(primary) + km/h(secondary) 둘 다 표시
- `pace_kmh`만 있으면: km/h(primary) + 변환된 min/km(secondary) 표시
- 변환 함수: `paceToKmh()`, `kmhToMinKm()`

## UI 패턴

- 로딩: `<OverviewSkeleton />` (스피너 대신 shimmer 스켈레톤)
- 카드 등장: `card-reveal` + `animationDelay` stagger (40ms 간격)
- 바 차트: `bar-grow` + 순차 delay
- 기간 비교: 동일 날짜 범위 비교 (`1일~dayOfMonth`)
- 운동 유형별 색상: `getTypeColor()` 함수로 관리

## 향후 과제: 평균 페이스 왜곡 방지

- **문제 1**: 짧은 거리(1km) 전력질주로 전체 평균페이스를 인위적으로 낮추는 꼼수
- **문제 2**: 회복일/이지런에서 의도적으로 느리게 뛰었는데 평균이 올라가면 "나빠진 것 같은" 느낌
- **해결 방향**:
  - 운동 유형별 페이스 분리 추적 (이지런 평균 / 템포 평균 / 인터벌 평균)
  - 전체 평균은 참고용 or 숨김
  - 거리 가중 평균 사용 (짧은 거리 꼼수 방지)
  - 이지런에서 느린 페이스 = 목표 심박 존 내면 "잘한 것"으로 표시
- **적용 시점**: 분석/코칭 기능 구현 시 (Phase 3~4)

## 사이드바 네비게이션

| 항목 | 경로 | 상태 |
|------|------|------|
| 오버뷰 | `/dashboard` | 활성 |
| 기록 | `/dashboard/records` | 활성 |
| 분석 | - | SOON |
| 성적표 | - | SOON |


<claude-mem-context>
# Recent Activity

### Feb 12, 2026

| ID | Time | T | Title | Read |
|----|------|---|-------|------|
| #631 | 6:54 PM | 🔴 | 사이드바 브랜드 영역 높이를 탑바와 정렬 | ~143 |
| #630 | 6:53 PM | 🔵 | youStopped 대시보드 레이아웃 구조 파악 | ~195 |
</claude-mem-context>