import {
  Camera,
  ChartNoAxesCombined,
  BrainCircuit,
  Watch,
  ArrowRight,
  Zap,
  MessageCircle,
} from "lucide-react";
import PreviewSection from "./components/PreviewSection";
import WaitlistForm from "./components/WaitlistForm";

function MockDataRow({
  date,
  type,
  distance,
  time,
  pace,
  hr,
  highlighted,
}: {
  date: string;
  type: string;
  distance: string;
  time: string;
  pace: string;
  hr: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-6 gap-2 px-3 py-2 text-xs font-mono rounded-lg transition-colors ${
        highlighted
          ? "bg-accent/10 text-accent border border-accent/20"
          : "text-zinc-400 hover:bg-card-hover"
      }`}
    >
      <span>{date}</span>
      <span>{type}</span>
      <span>{distance}</span>
      <span>{time}</span>
      <span>{pace}</span>
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
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Zap className="h-4 w-4 text-background" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              you<span className="text-accent">Stopped</span>
            </span>
          </div>
          <a
            href="#waitlist"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-all hover:bg-accent-dim hover:scale-105"
          >
            사전 등록
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(200,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(200,255,0,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-accent/5 blur-[120px]" />

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
                  사진 한 장이면 기록 끝.
                </span>{" "}
                AI가 성적표로 만들어드립니다.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#waitlist"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-bold text-background transition-all hover:bg-accent-dim hover:scale-105 animate-pulse-glow"
                >
                  출시 알림 받기
                  <ArrowRight className="h-4 w-4" />
                </a>
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
                <div className="grid grid-cols-6 gap-2 px-3 py-2 text-xs text-muted border-b border-border mb-1">
                  <span>날짜</span>
                  <span>종류</span>
                  <span>거리</span>
                  <span>시간</span>
                  <span>페이스</span>
                  <span>심박</span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <MockDataRow
                    date="02.01"
                    type="트레드밀"
                    distance="11.25"
                    time="56:27"
                    pace="12.2"
                    hr="145"
                  />
                  <MockDataRow
                    date="02.02"
                    type="트레드밀"
                    distance="10.0"
                    time="1:01:46"
                    pace="9.9"
                    hr="147"
                  />
                  <MockDataRow
                    date="02.03"
                    type="트레드밀"
                    distance="3.5"
                    time="25:15"
                    pace="8.4"
                    hr="132"
                  />
                  <MockDataRow
                    date="02.04"
                    type="트랙"
                    distance="10.01"
                    time="45:59"
                    pace="4:36"
                    hr="174"
                    highlighted
                  />
                  <MockDataRow
                    date="02.05"
                    type="트레드밀"
                    distance="10.0"
                    time="1:01:46"
                    pace="9.9"
                    hr="147"
                  />
                  <MockDataRow
                    date="02.08"
                    type="트랙"
                    distance="11.5"
                    time="55:20"
                    pace="4:48"
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
            <p className="mt-4 text-muted">사진 기록에서 시작해, AI 코칭까지</p>
          </div>

          <div className="relative">
            {/* Line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-accent via-accent/50 to-border md:left-1/2" />

            {[
              {
                icon: Camera,
                phase: "Phase 1",
                title: "사진으로 기록",
                desc: "스크린샷/사진 업로드 → AI 자동 인식 → 3초 기록 완료",
                status: "개발 중",
                active: true,
              },
              {
                icon: ChartNoAxesCombined,
                phase: "Phase 2",
                title: "러닝 성적표",
                desc: "한눈에 보이는 러닝 리포트. 월별 성장 추이, 개인기록 관리",
                status: "예정",
                active: false,
              },
              {
                icon: Watch,
                phase: "Phase 3",
                title: "워치 자동 연동",
                desc: "Garmin, Apple Watch에서 자동 싱크. 사진 업로드도 필요 없음",
                status: "예정",
                active: false,
              },
              {
                icon: BrainCircuit,
                phase: "Phase 4",
                title: "AI 맞춤 코칭",
                desc: "축적된 데이터 기반 AI 훈련 추천. 나만의 러닝 코치",
                status: "예정",
                active: false,
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
                      item.active
                        ? "border-accent bg-accent/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <item.icon
                      className={`h-4 w-4 ${
                        item.active ? "text-accent" : "text-muted"
                      }`}
                    />
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
                      item.active
                        ? "border-accent/30 bg-accent/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`text-xs font-mono font-bold ${
                          item.active ? "text-accent" : "text-muted"
                        }`}
                      >
                        {item.phase}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.active
                            ? "bg-accent/20 text-accent"
                            : "bg-card-hover text-muted"
                        }`}
                      >
                        {item.status}
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

      {/* CTA / Waitlist */}
      <section id="waitlist" className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">
            러닝 생활에
            <br />
            <span className="text-accent">불편한 점</span>이 있으신가요?
          </h2>
          <p className="text-muted mb-12">
            오픈채팅방에 오셔서 추가되었으면 하는 기능이나
            <br className="hidden sm:block" />
            러닝 생활의 불편함을 알려주세요. 해결해드리겠습니다.
          </p>

          <WaitlistForm />

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
