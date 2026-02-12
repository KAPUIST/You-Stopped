# youStopped 디자인 시스템

## 색상 (globals.css @theme inline)

| 변수 | 값 | 용도 |
|------|-----|------|
| `--color-background` | `#0f0f11` | 페이지 배경 |
| `--color-foreground` | `#fafafa` | 기본 텍스트 |
| `--color-accent` | `#c8ff00` | 브랜드 강조색 (라임 그린) |
| `--color-accent-dim` | `#a3cc00` | 강조색 어두운 변형 |
| `--color-muted` | `#878787` | 보조 텍스트 |
| `--color-card` | `#171719` | 카드 배경 |
| `--color-card-hover` | `#222225` | 카드 호버 |
| `--color-border` | `#2a2a2e` | 테두리 |
| `--color-surface` | `#1c1c1f` | 서피스 배경 |

## 텍스트 위계 (3단계만 사용)

| 단계 | 클래스 | 용도 |
|------|--------|------|
| Primary | `text-foreground` 또는 `text-foreground/80~85` | 주요 데이터, 제목 |
| Secondary | `text-muted` | 라벨, 단위(km, bpm, spm), 보조 정보 |
| Accent | `text-accent` | 핵심 수치 (거리, 횟수 등) |

### 금지 사항
- `text-muted/30`, `text-muted/40`, `text-muted/50` 사용 금지 — 다크 배경에서 안 보임
- 최소 `text-muted` (#878787) 이상 유지
- 단위 텍스트는 최소 `text-[11px]` 이상

## 폰트

- `font-sans`: Geist Sans (본문)
- `font-mono`: Geist Mono (숫자, 데이터, 날짜, 페이스)

## 브랜드 규칙

- accent 색상 `#c8ff00`은 브랜드 아이덴티티 — 절대 변경 금지
- 다크 테마 전용 (라이트 모드 없음)

## 애니메이션 (globals.css)

| 클래스 | 효과 | 용도 |
|--------|------|------|
| `.skeleton` | shimmer 효과 | 로딩 상태 |
| `.card-reveal` | fadeIn + translateY | 카드 staggered reveal |
| `.bar-grow` | scaleY 0→1 | 바 차트 |
| `.number-reveal` | fadeIn + translateY | 숫자 등장 |
| `.progress-fill` | width 0→target | 프로그레스 바 |

## 기술 스택

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4 (`@theme inline`)
- Supabase (Auth + DB + RLS)
- TypeScript


<claude-mem-context>

</claude-mem-context>