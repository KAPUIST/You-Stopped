import {
  Camera,
  ChartNoAxesCombined,
  BrainCircuit,
  Watch,
  Smartphone,
  ArrowRight,
  Zap,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { NavLogo } from "./components/NavLogo";
import PreviewSection from "./components/PreviewSection";
import FeedbackForm from "./components/WaitlistForm";

const TYPE_DOT_COLORS: Record<string, string> = {
  "로드": "bg-accent",
  "트레드밀": "bg-sky-400",
  "트랙": "bg-orange-400",
  "트레일": "bg-emerald-400",
};

function MockDataRow({
  date,
  type,
  distance,
  time,
  pace,
  cadence,
  hr,
  highlighted,
}: {
  date: string;
  type: string;
  distance: string;
  time: string;
  pace: string;
  cadence: string;
  hr: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-7 gap-2 px-3 py-2 text-xs font-mono rounded-lg transition-colors ${
        highlighted
          ? "bg-accent/10 text-accent border border-accent/20"
          : "text-muted hover:bg-card-hover"
      }`}
    >
      <span>{date}</span>
      <span className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT_COLORS[type] ?? "bg-zinc-400"}`} />
        {type}
      </span>
      <span>{distance}</span>
      <span>{time}</span>
      <span>{pace}</span>
      <span>{cadence}</span>
      <span>{hr}</span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <NavLogo />
          <div className="flex items-center gap-4">
            <Link
              href="/blog"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors"
            >
              블로그
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-all hover:bg-accent-dim hover:scale-105"
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-accent/3 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="flex flex-col gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent">
                <Zap className="h-3.5 w-3.5" />
                나만의 러닝 코치
              </div>

              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                러닝 데이터,
                <br />
                <span className="text-accent">한 번 보고</span>
                <br />
                버리고 있지 않나요?
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-muted">
                운동 끝나고 워치 한 번 보고, 어제보다 나았는지도 모른 채
                잊혀지는 데이터.{" "}
                <span className="text-foreground font-medium">
                  기록이 쌓이면, 스토리가 됩니다.
                </span>
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-bold text-background transition-all hover:bg-accent-dim hover:scale-105 animate-pulse-glow"
                >
                  무료로 시작하기
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#roadmap"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-8 py-4 text-base font-medium text-foreground transition-colors hover:bg-card"
                >
                  로드맵 보기
                </a>
              </div>
            </div>

            {/* Right: Mock UI */}
            <div className="relative animate-float">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    2026년 2월 기록
                  </span>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-mono text-accent">
                    67.3km
                  </span>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-7 gap-2 px-3 py-2 text-xs text-muted border-b border-border mb-1">
                  <span>날짜</span>
                  <span>유형</span>
                  <span>거리</span>
                  <span>시간</span>
                  <span>페이스</span>
                  <span>케이던스</span>
                  <span>심박</span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <MockDataRow
                    date="02.01"
                    type="트레드밀"
                    distance="11.25"
                    time="56:27"
                    pace={`5'01"`}
                    cadence="172"
                    hr="145"
                  />
                  <MockDataRow
                    date="02.02"
                    type="트레드밀"
                    distance="10.0"
                    time="1:01:46"
                    pace={`6'10"`}
                    cadence="168"
                    hr="147"
                  />
                  <MockDataRow
                    date="02.03"
                    type="트레드밀"
                    distance="3.5"
                    time="25:15"
                    pace={`7'13"`}
                    cadence="164"
                    hr="132"
                  />
                  <MockDataRow
                    date="02.04"
                    type="트랙"
                    distance="10.01"
                    time="45:59"
                    pace={`4'36"`}
                    cadence="186"
                    hr="174"
                    highlighted
                  />
                  <MockDataRow
                    date="02.05"
                    type="트레드밀"
                    distance="10.0"
                    time="1:01:46"
                    pace={`6'10"`}
                    cadence="168"
                    hr="147"
                  />
                  <MockDataRow
                    date="02.08"
                    type="트랙"
                    distance="11.5"
                    time="55:20"
                    pace={`4'48"`}
                    cadence="184"
                    hr="168"
                  />
                </div>

                {/* AI badge */}
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/5 border border-accent/20 p-3">
                  <BrainCircuit className="h-4 w-4 text-accent flex-shrink-0" />
                  <span className="text-xs text-accent">
                    같은 페이스인데 심박 +17 상승 → 회복일 필요. 내일은
                    쉬어가세요
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="relative py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              지금 당신의 러닝 데이터는
              <br />
              <span className="text-muted">이렇게 낭비되고 있습니다</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                emoji: "🫣",
                title: "한 번 보고 끝",
                desc: "워치 화면 한 번 확인하고 까먹음. 어제보다 나아졌는지도 모름.",
              },
              {
                emoji: "🤯",
                title: "앱은 복잡함",
                desc: "러닝 앱들은 정보가 넘쳐나는데, 정작 내가 원하는 건 한눈에 안 보임.",
              },
              {
                emoji: "😮‍💨",
                title: "엑셀은 귀찮음",
                desc: "깔끔하게 정리하고 싶지만, 매번 15칸 수동 입력은 현실적으로 힘듦.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-accent/30 hover:bg-card-hover"
              >
                <div className="mb-4 text-4xl">{item.emoji}</div>
                <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PreviewSection />

      {/* Roadmap / Vision */}
      <section id="roadmap" className="py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              로드맵
            </h2>
            <p className="mt-4 text-muted">데이터 연동에서 시작해, 맞춤 코칭까지</p>
          </div>

          <div className="relative">
            {/* Line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-accent via-accent/50 to-border md:left-1/2" />

            {[
              {
                icon: ChartNoAxesCombined,
                phase: "Phase 1",
                title: "대시보드",
                desc: "러닝 데이터 대시보드, 기록 관리, 신발 마일리지, 개인기록 추적",
                status: "완료",
                active: false,
                done: true,
              },
              {
                icon: Watch,
                phase: "Phase 2",
                title: "Strava 연동",
                desc: "Strava 계정 연동으로 러닝 데이터 자동 싱크. 수동 입력 없이 기록 관리",
                status: "개발 중",
                active: true,
                done: false,
              },
              {
                icon: Camera,
                phase: "Phase 3",
                title: "사진으로 기록",
                desc: "스크린샷/사진 업로드 → 자동 인식 → 3초 기록 완료",
                status: "예정",
                active: false,
                done: false,
              },
              {
                icon: BrainCircuit,
                phase: "Phase 4",
                title: "맞춤 훈련 플랜",
                desc: "개인 맞춤 훈련 플랜으로 목표 달성까지 함께하는 러닝 코치",
                status: "예정",
                active: false,
                done: false,
              },
              {
                icon: Smartphone,
                phase: "Phase 5",
                title: "모바일 앱",
                desc: "언제 어디서든 내 러닝 기록을 확인하고, 푸시 알림으로 훈련 리마인더까지",
                status: "예정",
                active: false,
                done: false,
              },
            ].map((item, i) => (
              <div
                key={item.phase}
                className={`relative flex items-start gap-8 pb-12 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Dot */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      item.done
                        ? "border-accent bg-accent text-background"
                        : item.active
                        ? "border-accent bg-accent/20"
                        : "border-border bg-card"
                    }`}
                  >
                    {item.done ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <item.icon
                        className={`h-4 w-4 ${
                          item.active ? "text-accent" : "text-muted"
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div
                  className={`ml-20 md:ml-0 md:w-[calc(50%-40px)] ${
                    i % 2 === 0 ? "md:pr-16" : "md:pl-16"
                  } ${i % 2 === 0 ? "" : "md:ml-auto"}`}
                >
                  <div
                    className={`rounded-2xl border p-6 transition-all ${
                      item.done
                        ? "border-accent/20 bg-accent/5"
                        : item.active
                        ? "border-accent/30 bg-accent/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`text-xs font-mono font-bold ${
                          item.done || item.active ? "text-accent" : "text-muted"
                        }`}
                      >
                        {item.phase}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.done
                            ? "bg-accent/20 text-accent"
                            : item.active
                            ? "bg-accent/20 text-accent"
                            : "bg-card-hover text-muted"
                        }`}
                      >
                        {item.done ? "✓ 완료" : item.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback */}
      <section id="feedback" className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">
            더 나은 서비스를 위해
            <br />
            <span className="text-accent">피드백</span>을 들려주세요
          </h2>
          <p className="text-muted mb-12">
            추가되었으면 하는 기능이나 불편한 점을 알려주세요.
            <br className="hidden sm:block" />
            여러분의 피드백이 다음 업데이트의 우선순위가 됩니다.
          </p>

          <FeedbackForm />

          <div className="mt-6 flex justify-center">
            <a
              href="https://open.kakao.com/o/gMoOA5fi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              <MessageCircle className="h-4 w-4" />
              카카오톡 오픈채팅 참여하기
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-accent">
              <Zap className="h-3 w-3 text-background" />
            </div>
            <span className="text-sm font-bold">
              you<span className="text-accent">Stopped</span>
            </span>
          </div>
          <p className="text-xs text-muted">
            &copy; 2026 youStopped. 러닝 데이터, 더 이상 버리지 마세요.
          </p>
        </div>
      </footer>
    </div>
  );
}
