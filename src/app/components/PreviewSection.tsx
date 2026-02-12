"use client";

import { useState } from "react";
import {
  TrendingUp,
  Footprints,
  Trophy,
  BrainCircuit,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Minus,
  Activity,
  Flame,
  Timer,
  Heart,
  Route,
  Target,
} from "lucide-react";

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-background"
          : "bg-border text-muted hover:bg-card-hover"
      }`}
    >
      {label}
    </button>
  );
}

// ─── 대시보드 오버뷰 ───
function DashboardOverview() {
  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Activity className="h-4 w-4 text-background" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              2월 러닝 리포트
            </div>
            <div className="text-[11px] text-foreground0">
              2026.02.01 — 02.12 · 12일간 기록
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-medium text-green-400">
            기록 중
          </span>
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          {
            icon: Route,
            label: "총 거리",
            value: "67.3",
            unit: "km",
            sub: "월목표 120km",
            pct: 56,
          },
          {
            icon: Flame,
            label: "총 러닝",
            value: "9",
            unit: "회",
            sub: "주 평균 4.5회",
            pct: null,
          },
          {
            icon: Timer,
            label: "평균 페이스",
            value: "5:12",
            unit: "/km",
            sub: "지난달 5:28",
            pct: null,
            trend: "up",
          },
          {
            icon: Heart,
            label: "평균 심박",
            value: "156",
            unit: "bpm",
            sub: "지난달 151",
            pct: null,
            trend: "up_bad",
          },
          {
            icon: Trophy,
            label: "이달 PR",
            value: "2",
            unit: "건",
            sub: "10K · 3K 갱신",
            pct: null,
          },
          {
            icon: Target,
            label: "VDOT",
            value: "52.1",
            unit: "",
            sub: "지난달 50.8",
            pct: null,
            trend: "up",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-border bg-background/60 p-4"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <m.icon className="h-3.5 w-3.5 text-foreground0" />
              <span className="text-[10px] text-foreground0">{m.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-foreground">
                {m.value}
              </span>
              <span className="text-xs text-foreground0">{m.unit}</span>
              {"trend" in m && m.trend && (
                <span className="ml-auto">
                  {m.trend === "up" ? (
                    <ArrowUp className="h-3 w-3 text-accent" />
                  ) : m.trend === "up_bad" ? (
                    <ArrowUp className="h-3 w-3 text-red-400" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-400" />
                  )}
                </span>
              )}
            </div>
            <div className="mt-1.5 text-[10px] text-muted/70">{m.sub}</div>
            {m.pct !== null && (
              <div className="mt-2 h-1 w-full rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent/60"
                  style={{ width: `${m.pct}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mini week heatmap + AI summary */}
      <div className="grid sm:grid-cols-[1fr_1fr] gap-4">
        {/* Weekly activity */}
        <div className="rounded-xl border border-border bg-background/60 p-4">
          <div className="text-[10px] text-foreground0 mb-3">이번 주 활동</div>
          <div className="flex gap-1.5">
            {[
              { day: "월", km: 11.25, active: true },
              { day: "화", km: 10.0, active: true },
              { day: "수", km: 3.5, active: true },
              { day: "목", km: 10.01, active: true },
              { day: "금", km: 10.0, active: true },
              { day: "토", km: 0, active: false },
              { day: "일", km: 11.5, active: true },
            ].map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full aspect-square rounded-md flex items-center justify-center text-[9px] font-mono ${
                    !d.active
                      ? "bg-card-hover/50 text-muted/50"
                      : d.km >= 10
                        ? "bg-accent/30 text-accent"
                        : "bg-accent/10 text-accent/60"
                  }`}
                >
                  {d.active ? d.km.toFixed(1) : "—"}
                </div>
                <span className="text-[9px] text-muted/70">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI quick summary */}
        <div className="rounded-xl border border-accent/10 bg-accent/[0.03] p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <BrainCircuit className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] text-accent">AI 주간 요약</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              "이번 주 6회 러닝, 총 56.3km 소화",
              "10K PR 갱신 (45:59) — VDOT 52.1 달성",
              "심박 상승 추세 감지 → 내일 회복일 권장",
              "다음 주 목표: 볼륨 유지 + 회복일 추가",
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-accent/40 text-[10px] mt-0.5">
                  {i === 2 ? "⚠" : "→"}
                </span>
                <span
                  className={`text-[11px] leading-relaxed ${
                    i === 2
                      ? "text-amber-400"
                      : "text-muted"
                  }`}
                >
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 페이스 성장 추이 ───
const paceData: Record<
  string,
  {
    bars: { h: number; m: string; dim: boolean }[];
    from: string;
    to: string;
    label: string;
    insight: string;
  }
> = {
  "1km": {
    bars: [
      { h: 40, m: "7월", dim: true },
      { h: 48, m: "8월", dim: true },
      { h: 55, m: "9월", dim: true },
      { h: 60, m: "10월", dim: true },
      { h: 72, m: "11월", dim: false },
      { h: 80, m: "12월", dim: false },
      { h: 88, m: "1월", dim: false },
      { h: 96, m: "2월", dim: false },
    ],
    from: "4:20",
    to: "3:42",
    label: "1km",
    insight: "최근 3개월 구간 가속력이 눈에 띄게 향상. 인터벌 훈련 효과가 나타나고 있습니다.",
  },
  "3km": {
    bars: [
      { h: 45, m: "7월", dim: true },
      { h: 50, m: "8월", dim: true },
      { h: 58, m: "9월", dim: true },
      { h: 62, m: "10월", dim: true },
      { h: 75, m: "11월", dim: false },
      { h: 85, m: "12월", dim: false },
      { h: 95, m: "1월", dim: false },
      { h: 110, m: "2월", dim: false },
    ],
    from: "5:10",
    to: "4:24",
    label: "3km",
    insight: "LT(젖산역치) 구간 능력 향상 중. 4:20/km 진입 시 10K 기록도 함께 단축됩니다.",
  },
  "5km": {
    bars: [
      { h: 55, m: "8월", dim: true },
      { h: 58, m: "9월", dim: true },
      { h: 65, m: "10월", dim: true },
      { h: 72, m: "11월", dim: false },
      { h: 78, m: "12월", dim: false },
      { h: 84, m: "1월", dim: false },
    ],
    from: "5:40",
    to: "4:55",
    label: "5km",
    insight: "아직 공인 기록 없음. 현재 훈련 데이터 기반 예상 기록: 24:35 (4:55/km)",
  },
  "10K": {
    bars: [
      { h: 50, m: "5월", dim: true },
      { h: 56, m: "6월", dim: true },
      { h: 62, m: "7월", dim: true },
      { h: 60, m: "8월", dim: true },
      { h: 70, m: "9월", dim: true },
      { h: 78, m: "10월", dim: true },
      { h: 90, m: "11월", dim: false },
      { h: 100, m: "12월", dim: false },
      { h: 112, m: "1월", dim: false },
      { h: 126, m: "2월", dim: false },
    ],
    from: "6:00",
    to: "4:36",
    label: "10K",
    insight: "10개월간 1:24/km 단축. 월평균 8.5초/km씩 꾸준히 성장하고 있습니다.",
  },
  Half: {
    bars: [
      { h: 50, m: "8월", dim: true },
      { h: 58, m: "9월", dim: true },
      { h: 68, m: "10월", dim: true },
      { h: 80, m: "11월", dim: false },
      { h: 88, m: "12월", dim: false },
      { h: 98, m: "1월", dim: false },
    ],
    from: "5:35",
    to: "4:57",
    label: "Half",
    insight: "하프 기록 1:44:55. 서브 1:40 돌파하려면 10K 페이스를 4:30 이내로 끌어올려야 합니다.",
  },
  Full: {
    bars: [
      { h: 70, m: "10월", dim: true },
      { h: 82, m: "11월", dim: false },
      { h: 78, m: "12월", dim: false },
    ],
    from: "6:15",
    to: "5:58",
    label: "Full",
    insight: "풀코스 4:09:47. 서브4 달성 전략: 30km 벽 대비 후반부 페이스 관리가 핵심입니다.",
  },
};

function PaceChart() {
  const [selected, setSelected] = useState("10K");
  const data = paceData[selected];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-accent" />
        <span className="text-sm font-semibold text-foreground">페이스 성장 추이</span>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto">
        {Object.keys(paceData).map((key) => (
          <Tab
            key={key}
            label={key}
            active={selected === key}
            onClick={() => setSelected(key)}
          />
        ))}
      </div>

      <div className="relative pl-8">
        <div className="absolute left-0 top-0 h-36 flex flex-col justify-between text-[10px] text-foreground0">
          <span>Best</span>
          <span />
          <span />
          <span>Start</span>
        </div>
        <div className="flex items-end gap-1.5 h-36">
          {data.bars.map((bar) => (
            <div
              key={bar.m}
              className="flex-1 flex flex-col items-center justify-end h-full gap-1"
            >
              <div
                className={`w-full rounded-t-md transition-all duration-300 ${
                  bar.dim ? "bg-accent/20" : "bg-accent/50"
                }`}
                style={{ height: `${bar.h}px` }}
              />
              <span className="text-[9px] text-foreground0">{bar.m}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-accent/5 border border-accent/20 p-3">
        <span className="text-xs text-muted">{data.label} 페이스</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-foreground0 line-through">
            {data.from}
          </span>
          <ArrowRight className="h-3 w-3 text-accent" />
          <span className="text-sm font-mono font-bold text-accent">
            {data.to}
          </span>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted leading-relaxed">
        <span className="text-accent font-medium">AI 분석:</span> {data.insight}
      </p>
    </div>
  );
}

// ─── 신발 마일리지 ───
const shoeViews: Record<
  string,
  { name: string; total: number; status: string; pct: number }[]
> = {
  전체: [
    { name: "줌플라이 6", total: 618, status: "교체임박", pct: 77 },
    { name: "프로 4", total: 388, status: "사용중", pct: 48 },
    { name: "베이퍼플라이 4", total: 41, status: "레이스용", pct: 5 },
    { name: "페가수스 41", total: 12, status: "신규", pct: 1.5 },
  ],
  로드: [
    { name: "줌플라이 6", total: 554, status: "메인", pct: 69 },
    { name: "프로 4", total: 388, status: "메인", pct: 48 },
    { name: "베이퍼플라이 4", total: 41, status: "레이스", pct: 5 },
  ],
  트레드밀: [
    { name: "줌플라이 6", total: 64, status: "보조", pct: 8 },
    { name: "페가수스 41", total: 12, status: "메인", pct: 1.5 },
  ],
};

function ShoeCard() {
  const [view, setView] = useState("전체");
  const shoes = shoeViews[view];

  const statusColor = (s: string) => {
    switch (s) {
      case "교체임박":
        return "bg-red-500/20 text-red-400";
      case "레이스용":
      case "레이스":
        return "bg-purple-500/20 text-purple-400";
      case "신규":
        return "bg-blue-500/20 text-blue-400";
      case "메인":
        return "bg-accent/20 text-accent";
      default:
        return "bg-card-hover text-muted";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Footprints className="h-5 w-5 text-accent" />
          <span className="text-sm font-semibold text-foreground">신발 마일리지</span>
        </div>
      </div>

      <div className="flex gap-1.5 mb-5">
        {Object.keys(shoeViews).map((key) => (
          <Tab
            key={key}
            label={key}
            active={view === key}
            onClick={() => setView(key)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {shoes.map((shoe) => (
          <div key={shoe.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground/80">
                  {shoe.name}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] ${statusColor(shoe.status)}`}
                >
                  {shoe.status}
                </span>
              </div>
              <span className="text-xs font-mono text-muted">
                {shoe.total}
                <span className="text-muted/70">/800</span>km
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-border overflow-hidden relative">
              <div className="absolute right-0 top-0 bottom-0 w-px bg-muted/40" />
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  shoe.pct > 70
                    ? "bg-gradient-to-r from-[#c8ff00] to-red-400"
                    : "bg-accent/60"
                }`}
                style={{ width: `${shoe.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <span className="text-xs text-amber-400">
          ⚠ 줌플라이 6 교체 시기가 다가오고 있습니다 (618/800km)
        </span>
      </div>
    </div>
  );
}

// ─── 개인기록 ───
type PRView = "기록" | "목표" | "예측";

const prRecords = [
  { dist: "1km", time: "—", pace: "", status: "미기록" },
  { dist: "3km", time: "13:16", pace: "4:24", status: "PR" },
  { dist: "5km", time: "—", pace: "", status: "미기록" },
  { dist: "10K", time: "45:59", pace: "4:36", status: "PR" },
  { dist: "Half", time: "1:44:55", pace: "4:57", status: "PR" },
  { dist: "Full", time: "4:09:47", pace: "5:58", status: "PR" },
];

const prGoals = [
  { dist: "1km", time: "3:30", gap: "도전" },
  { dist: "3km", time: "12:30", gap: "-46초" },
  { dist: "5km", time: "23:00", gap: "도전" },
  { dist: "10K", time: "44:00", gap: "-1:59" },
  { dist: "Half", time: "1:40:00", gap: "-4:55" },
  { dist: "Full", time: "3:59:00", gap: "-10:47" },
];

const prPredict = [
  { dist: "1km", time: "~3:38", basis: "인터벌 데이터" },
  { dist: "3km", time: "~12:48", basis: "TT 추정" },
  { dist: "5km", time: "~22:30", basis: "VDOT 기반" },
  { dist: "10K", time: "~45:00", basis: "현재 컨디션" },
  { dist: "Half", time: "~1:42:00", basis: "최근 롱런" },
  { dist: "Full", time: "~3:55:00", basis: "페이스 추세" },
];

function PRCard() {
  const [view, setView] = useState<PRView>("기록");

  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-accent" />
        <span className="text-sm font-semibold text-foreground">개인 기록 (PR)</span>
      </div>

      <div className="flex gap-1.5 mb-5">
        {(["기록", "목표", "예측"] as PRView[]).map((t) => (
          <Tab key={t} label={t} active={view === t} onClick={() => setView(t)} />
        ))}
      </div>

      {view === "기록" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {prRecords.map((pr) => (
              <div
                key={pr.dist}
                className={`rounded-xl border p-3 text-center ${
                  pr.status === "미기록"
                    ? "border-dashed border-border/60"
                    : "border-border bg-background/50"
                }`}
              >
                <div className="text-[10px] text-foreground0 mb-1">{pr.dist}</div>
                <div
                  className={`text-sm font-mono font-bold ${
                    pr.status === "미기록" ? "text-muted/70" : "text-foreground"
                  }`}
                >
                  {pr.time}
                </div>
                <div
                  className={`text-[10px] ${
                    pr.pace ? "text-accent" : "text-muted/70"
                  }`}
                >
                  {pr.pace ? `${pr.pace}/km` : "미기록"}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/5 border border-accent/20 p-3">
            <Trophy className="h-3.5 w-3.5 text-accent flex-shrink-0" />
            <span className="text-xs text-accent">
              10K 신기록! 45:59 (이전: 46:57에서 58초 단축)
            </span>
          </div>
        </>
      )}

      {view === "목표" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {prGoals.map((g) => (
              <div
                key={g.dist}
                className="rounded-xl border border-border bg-background/50 p-3 text-center"
              >
                <div className="text-[10px] text-foreground0 mb-1">{g.dist}</div>
                <div className="text-sm font-mono font-bold text-foreground">
                  {g.time}
                </div>
                <div className="flex items-center justify-center gap-0.5 text-[10px]">
                  {g.gap === "도전" ? (
                    <span className="text-blue-400">{g.gap}</span>
                  ) : (
                    <>
                      <ArrowDown className="h-2.5 w-2.5 text-accent" />
                      <span className="text-accent">{g.gap}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-muted leading-relaxed">
            <span className="text-accent font-medium">AI 분석:</span> 10K
            서브45 달성이 가장 가까운 목표입니다. 주 1회 4:20 페이스 인터벌을 추가하세요.
          </p>
        </>
      )}

      {view === "예측" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {prPredict.map((p) => (
              <div
                key={p.dist}
                className="rounded-xl border border-accent/10 bg-accent/5 p-3 text-center"
              >
                <div className="text-[10px] text-foreground0 mb-1">{p.dist}</div>
                <div className="text-sm font-mono font-bold text-accent">
                  {p.time}
                </div>
                <div className="text-[10px] text-foreground0">{p.basis}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-muted leading-relaxed">
            <span className="text-accent font-medium">VDOT 52 기준:</span>{" "}
            최근 10K 기록과 훈련 데이터를 종합하여 산출한 예측 기록입니다. 현재
            컨디션 유지 시 달성 가능한 수치입니다.
          </p>
        </>
      )}
    </div>
  );
}

// ─── AI 데이터 분석 ───
type AIView = "컨디션" | "패턴" | "추천";

function AICard() {
  const [view, setView] = useState<AIView>("컨디션");

  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit className="h-5 w-5 text-accent" />
        <span className="text-sm font-semibold text-foreground">AI 데이터 분석</span>
      </div>

      <div className="flex gap-1.5 mb-5">
        {(["컨디션", "패턴", "추천"] as AIView[]).map((t) => (
          <Tab key={t} label={t} active={view === t} onClick={() => setView(t)} />
        ))}
      </div>

      {view === "컨디션" && (
        <div className="flex flex-col gap-3">
          {/* 심박-페이스 비율 */}
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-amber-400 text-xs">⚡</span>
              <span className="text-xs font-medium text-amber-400">
                피로 지표 상승
              </span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              최근 5km 러닝에서{" "}
              <span className="text-foreground/80 font-medium">페이스 5:21 동일</span>
              하지만
              <span className="text-amber-400 font-medium">
                {" "}
                심박 155→172 (+11%)
              </span>
              상승. 같은 속도에 심장 부담이 커지고 있습니다.
            </p>
          </div>

          {/* 컨디션 지표 */}
          <div className="rounded-xl bg-background/50 border border-border p-4">
            <div className="text-xs font-medium text-foreground/80 mb-3">
              주간 컨디션 스코어
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "심폐", score: 82, trend: "up" },
                { label: "지구력", score: 78, trend: "same" },
                { label: "회복력", score: 61, trend: "down" },
                { label: "스피드", score: 88, trend: "up" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-lg font-bold text-foreground">
                    {item.score}
                  </div>
                  <div className="flex items-center justify-center gap-0.5">
                    {item.trend === "up" && (
                      <ArrowUp className="h-2.5 w-2.5 text-accent" />
                    )}
                    {item.trend === "down" && (
                      <ArrowDown className="h-2.5 w-2.5 text-red-400" />
                    )}
                    {item.trend === "same" && (
                      <Minus className="h-2.5 w-2.5 text-foreground0" />
                    )}
                    <span className="text-[10px] text-foreground0">
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            <span className="text-accent font-medium">종합:</span> 회복력
            점수 하락 주의. 이번 주는 강도를 70%로 낮추는 것을 권장합니다.
          </p>
        </div>
      )}

      {view === "패턴" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-blue-400 text-xs">📊</span>
              <span className="text-xs font-medium text-blue-400">
                회복 패턴
              </span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              3일 연속 고강도 후{" "}
              <span className="text-foreground/80 font-medium">페이스 평균 12% 하락</span>
              . 회복일을{" "}
              <span className="text-blue-400 font-medium">2일→3일 조정</span>
              하면 퍼포먼스 유지 가능.
            </p>
          </div>

          <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-purple-400 text-xs">🔄</span>
              <span className="text-xs font-medium text-purple-400">
                최적 훈련 주기
              </span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              데이터 분석 결과 당신의 최적 사이클:{" "}
              <span className="text-foreground/80 font-medium">
                고강도 2일 → 회복 1일 → 중강도 1일 → 휴식
              </span>
              . 이 패턴에서 기록 갱신이 가장 많았습니다.
            </p>
          </div>

          <div className="rounded-xl bg-accent/5 border border-accent/20 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-accent text-xs">🌡️</span>
              <span className="text-xs font-medium text-accent">
                환경 상관관계
              </span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              트레드밀 대비 트랙 훈련 시{" "}
              <span className="text-foreground/80 font-medium">
                페이스 8% 빠르지만 심박 6% 높음
              </span>
              . 트랙 훈련 비중을 늘리면 실전 적응력이 올라갑니다.
            </p>
          </div>
        </div>
      )}

      {view === "추천" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-background/50 border border-border p-4">
            <div className="text-xs font-medium text-foreground/80 mb-3">
              이번 주 맞춤 훈련
            </div>
            <div className="flex flex-col gap-2">
              {[
                {
                  day: "월",
                  workout: "회복 조깅 4km",
                  pace: "7:00",
                  reason: "피로 해소",
                  color: "text-green-400",
                },
                {
                  day: "수",
                  workout: "인터벌 1000m × 5",
                  pace: "4:10",
                  reason: "LT 향상",
                  color: "text-red-400",
                },
                {
                  day: "금",
                  workout: "지속주 8km",
                  pace: "5:30",
                  reason: "유산소 베이스",
                  color: "text-amber-400",
                },
                {
                  day: "일",
                  workout: "롱런 15km",
                  pace: "6:00",
                  reason: "지구력 강화",
                  color: "text-blue-400",
                },
              ].map((plan) => (
                <div
                  key={plan.day}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/10 text-[10px] font-bold text-accent">
                      {plan.day}
                    </span>
                    <span className="text-foreground/70">{plan.workout}</span>
                    <span className="font-mono text-muted/70">
                      {plan.pace}/km
                    </span>
                  </div>
                  <span className={`text-[10px] ${plan.color}`}>
                    {plan.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            <span className="text-accent font-medium">근거:</span> 현재
            피로도(회복력 61점) 감안하여 주 총 거리를 지난주 67km에서{" "}
            <span className="text-foreground/80 font-medium">42km(-37%)</span>으로
            조정. 다음 주 다시 볼륨 업합니다.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 주간 훈련 플랜 ───
type PlanWeek = "이번 주" | "다음 주" | "대회 준비";

const weeklyPlans: Record<
  PlanWeek,
  {
    summary: string;
    totalKm: string;
    days: {
      day: string;
      type: string;
      workout: string;
      dist: string;
      pace: string;
      intensity: "rest" | "easy" | "moderate" | "hard" | "race";
      note: string;
    }[];
    aiNote: string;
  }
> = {
  "이번 주": {
    summary: "회복 중심 주간 · 피로도 관리",
    totalKm: "42km",
    days: [
      {
        day: "월",
        type: "회복",
        workout: "이지런",
        dist: "5km",
        pace: "6:30",
        intensity: "easy",
        note: "심박 140 이하 유지",
      },
      {
        day: "화",
        type: "휴식",
        workout: "완전 휴식",
        dist: "—",
        pace: "—",
        intensity: "rest",
        note: "스트레칭 + 폼롤러",
      },
      {
        day: "수",
        type: "인터벌",
        workout: "1000m × 5",
        dist: "8km",
        pace: "4:10",
        intensity: "hard",
        note: "회복 조깅 400m 사이",
      },
      {
        day: "목",
        type: "회복",
        workout: "이지런",
        dist: "4km",
        pace: "7:00",
        intensity: "easy",
        note: "어제 인터벌 회복",
      },
      {
        day: "금",
        type: "지속주",
        workout: "템포런",
        dist: "8km",
        pace: "5:10",
        intensity: "moderate",
        note: "LT 페이스 유지 연습",
      },
      {
        day: "토",
        type: "롱런",
        workout: "장거리",
        dist: "15km",
        pace: "5:50",
        intensity: "moderate",
        note: "후반 5km 페이스 업",
      },
      {
        day: "일",
        type: "휴식",
        workout: "액티브 레스트",
        dist: "2km",
        pace: "8:00",
        intensity: "rest",
        note: "산책 or 가벼운 조깅",
      },
    ],
    aiNote:
      "회복력 점수(61점) 감안하여 주간 볼륨을 67km → 42km으로 조정. 수요일 인터벌은 유지하되 세트 수를 7 → 5로 줄였습니다.",
  },
  "다음 주": {
    summary: "볼륨 회복 · 지구력 강화 주간",
    totalKm: "55km",
    days: [
      {
        day: "월",
        type: "회복",
        workout: "이지런",
        dist: "6km",
        pace: "6:20",
        intensity: "easy",
        note: "주말 롱런 회복",
      },
      {
        day: "화",
        type: "인터벌",
        workout: "800m × 6",
        dist: "9km",
        pace: "3:55",
        intensity: "hard",
        note: "VO2max 자극",
      },
      {
        day: "수",
        type: "회복",
        workout: "이지런",
        dist: "5km",
        pace: "6:40",
        intensity: "easy",
        note: "심박 135 이하",
      },
      {
        day: "목",
        type: "지속주",
        workout: "크루즈 인터벌",
        dist: "10km",
        pace: "4:50",
        intensity: "moderate",
        note: "2km × 5 (jog 1분)",
      },
      {
        day: "금",
        type: "휴식",
        workout: "완전 휴식",
        dist: "—",
        pace: "—",
        intensity: "rest",
        note: "주말 롱런 준비",
      },
      {
        day: "토",
        type: "롱런",
        workout: "장거리",
        dist: "21km",
        pace: "5:40",
        intensity: "moderate",
        note: "하프 시뮬레이션",
      },
      {
        day: "일",
        type: "회복",
        workout: "이지런",
        dist: "4km",
        pace: "7:00",
        intensity: "easy",
        note: "가볍게 풀기",
      },
    ],
    aiNote:
      "이번 주 회복이 잘 되면 볼륨을 55km까지 올립니다. 토요일 하프 시뮬레이션으로 대회 감각을 미리 잡아두세요.",
  },
  "대회 준비": {
    summary: "테이퍼링 · 10K 대회 D-7",
    totalKm: "28km",
    days: [
      {
        day: "월",
        type: "지속주",
        workout: "레이스 페이스",
        dist: "5km",
        pace: "4:36",
        intensity: "moderate",
        note: "대회 페이스 확인",
      },
      {
        day: "화",
        type: "회복",
        workout: "이지런",
        dist: "4km",
        pace: "6:30",
        intensity: "easy",
        note: "가볍게",
      },
      {
        day: "수",
        type: "인터벌",
        workout: "400m × 4",
        dist: "5km",
        pace: "4:00",
        intensity: "hard",
        note: "짧고 날카롭게",
      },
      {
        day: "목",
        type: "회복",
        workout: "이지런",
        dist: "3km",
        pace: "7:00",
        intensity: "easy",
        note: "다리 풀기",
      },
      {
        day: "금",
        type: "휴식",
        workout: "완전 휴식",
        dist: "—",
        pace: "—",
        intensity: "rest",
        note: "탄수화물 로딩",
      },
      {
        day: "토",
        type: "셰이크아웃",
        workout: "조깅",
        dist: "2km",
        pace: "6:00",
        intensity: "easy",
        note: "대회 전날 가볍게",
      },
      {
        day: "일",
        type: "🏁 대회",
        workout: "10K 레이스",
        dist: "10km",
        pace: "4:30",
        intensity: "race",
        note: "목표: 서브 45",
      },
    ],
    aiNote:
      "테이퍼링 주간입니다. 볼륨을 평소의 40%로 줄이고, 수요일 짧은 인터벌로 날카로움만 유지합니다. 목표 서브45 충분히 가능합니다.",
  },
};

function TrainingPlan() {
  const [week, setWeek] = useState<PlanWeek>("이번 주");
  const plan = weeklyPlans[week];

  const intensityStyle = (i: string) => {
    switch (i) {
      case "hard":
        return "bg-red-500/20 text-red-400";
      case "moderate":
        return "bg-amber-500/20 text-amber-400";
      case "easy":
        return "bg-green-500/20 text-green-400";
      case "race":
        return "bg-accent/20 text-accent";
      default:
        return "bg-border text-foreground0";
    }
  };

  const intensityLabel = (i: string) => {
    switch (i) {
      case "hard":
        return "고강도";
      case "moderate":
        return "중강도";
      case "easy":
        return "저강도";
      case "race":
        return "레이스";
      default:
        return "휴식";
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗓️</span>
          <span className="text-sm font-semibold text-foreground">
            AI 맞춤 훈련 플랜
          </span>
        </div>
        <div className="flex gap-1.5">
          {(Object.keys(weeklyPlans) as PlanWeek[]).map((key) => (
            <Tab
              key={key}
              label={key}
              active={week === key}
              onClick={() => setWeek(key)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 rounded-lg bg-accent/5 border border-accent/10 px-4 py-2.5">
        <span className="text-xs text-muted">{plan.summary}</span>
        <span className="text-xs font-mono font-bold text-accent">
          주간 {plan.totalKm}
        </span>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[40px_60px_1fr_56px_56px_60px_1fr] gap-2 px-3 py-2 text-[10px] text-foreground0 border-b border-border mb-1">
        <span>요일</span>
        <span>분류</span>
        <span>훈련</span>
        <span>거리</span>
        <span>페이스</span>
        <span>강도</span>
        <span>비고</span>
      </div>

      {/* Table rows */}
      <div className="flex flex-col gap-0.5">
        {plan.days.map((d) => (
          <div
            key={d.day}
            className={`grid sm:grid-cols-[40px_60px_1fr_56px_56px_60px_1fr] grid-cols-[40px_1fr_56px] gap-2 px-3 py-2.5 text-xs font-mono rounded-lg transition-colors ${
              d.intensity === "race"
                ? "bg-accent/10 border border-accent/20"
                : d.intensity === "rest"
                  ? "text-muted/70"
                  : "text-foreground/70 hover:bg-card-hover/50"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${
                d.intensity === "race"
                  ? "bg-accent text-background"
                  : d.intensity === "hard"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-border text-muted"
              }`}
            >
              {d.day}
            </span>
            <span className="hidden sm:block text-muted">{d.type}</span>
            <span
              className={
                d.intensity === "race"
                  ? "text-accent font-semibold"
                  : "text-foreground/80"
              }
            >
              {d.workout}
            </span>
            <span className="text-muted">{d.dist}</span>
            <span
              className={`hidden sm:block ${d.pace === "—" ? "text-muted/70" : "text-foreground/70"}`}
            >
              {d.pace !== "—" ? `${d.pace}/km` : "—"}
            </span>
            <span className="hidden sm:block">
              <span
                className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] ${intensityStyle(d.intensity)}`}
              >
                {intensityLabel(d.intensity)}
              </span>
            </span>
            <span className="hidden sm:block text-foreground0 font-sans text-[11px]">
              {d.note}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-accent/5 border border-accent/20 p-3">
        <p className="text-[11px] text-muted leading-relaxed">
          <span className="text-accent font-medium">AI 코치 코멘트:</span>{" "}
          {plan.aiNote}
        </p>
      </div>
    </div>
  );
}

// ─── Main Export ───
export default function PreviewSection() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            당신의 데이터가
            <br />
            <span className="text-accent">이렇게 바뀝니다</span>
          </h2>
          <p className="mt-4 text-muted">
            흩어진 숫자들이 한눈에 읽히는 러닝 리포트로
          </p>
        </div>

        <DashboardOverview />

        <div className="grid gap-8 lg:grid-cols-2">
          <PaceChart />
          <ShoeCard />
          <PRCard />
          <AICard />
        </div>

        <TrainingPlan />
      </div>
    </section>
  );
}
