# youStopped 디자인 시스템

## 테마 (globals.css @theme inline)

`@theme inline`에서 CSS 변수를 참조하며, `:root`(라이트)와 `.dark`(다크) 두 모드를 지원합니다.

### Light 모드 (기본)
| 변수 | 값 | 용도 |
|------|-----|------|
| `--bg` | `#f5f5f4` | 페이지 배경 |
| `--fg` | `#1c1917` | 기본 텍스트 |
| `--accent` | `#15803d` | 브랜드 강조색 (그린) |
| `--accent-dim` | `#166534` | 강조색 어두운 변형 |
| `--muted` | `#78716c` | 보조 텍스트 |
| `--card-bg` | `#fafaf9` | 카드 배경 |
| `--card-hover-bg` | `#f0efed` | 카드 호버 |
| `--border-color` | `#d6d3d1` | 테두리 |
| `--surface-bg` | `#eeeceb` | 서피스 배경 |

### Dark 모드 (`.dark` 클래스)
| 변수 | 값 | 용도 |
|------|-----|------|
| `--bg` | `#171717` | 페이지 배경 |
| `--fg` | `#ededed` | 기본 텍스트 |
| `--accent` | `#c8ff00` | 브랜드 강조색 (라임 그린) |
| `--accent-dim` | `#a3cc00` | 강조색 어두운 변형 |
| `--muted` | `#a1a1a7` | 보조 텍스트 |
| `--card-bg` | `#222222` | 카드 배경 |
| `--card-hover-bg` | `#2c2c2c` | 카드 호버 |
| `--border-color` | `#3e3e44` | 테두리 |
| `--surface-bg` | `#262626` | 서피스 배경 |

## 텍스트 위계 (3단계만 사용)

| 단계 | 클래스 | 용도 |
|------|--------|------|
| Primary | `text-foreground` 또는 `text-foreground/80~85` | 주요 데이터, 제목 |
| Secondary | `text-muted` | 라벨, 단위(km, bpm, spm), 보조 정보 |
| Accent | `text-accent` | 핵심 수치 (거리, 횟수 등) |

### 금지 사항
- `text-muted/30`, `text-muted/40`, `text-muted/50` 사용 금지 — 양쪽 모드에서 가독성 저하
- 최소 `text-muted` 이상 유지
- 단위 텍스트는 최소 `text-[11px]` 이상

## 폰트

- `font-sans`: Geist Sans (본문)
- `font-mono`: Geist Mono (숫자, 데이터, 날짜, 페이스)

## 브랜드 규칙

- Light accent `#15803d` / Dark accent `#c8ff00` — 모드별 브랜드 색상
- 라이트 모드가 기본, `.dark` 클래스로 다크 모드 전환

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