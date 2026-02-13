"use client";

import { useState, useMemo, useEffect } from "react";
import { useDashboard, type ShoeDistanceLog } from "./context";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Route,
  Timer,
  Heart,
  Trophy,
  Footprints,
  AlertTriangle,
} from "lucide-react";

import {
  parsePaceToSeconds,
  formatPace,
  formatPaceColon,
  kmhToMinKm,
  paceToKmh,
  parseDurationToSeconds,
  formatDuration,
} from "./utils";
import { getTypeStyle } from "./constants";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ─── PR Constants ───────────────────────────

const PR_DISTANCES = [
  { label: "1km", min: 0.95, max: 1.05 },
  { label: "3km", min: 2.90, max: 3.10 },
  { label: "5km", min: 4.90, max: 5.10 },
  { label: "10K", min: 9.80, max: 10.20 },
  { label: "Half", min: 20.50, max: 21.50 },
  { label: "Full", min: 41.50, max: 43.00 },
] as const;

const PERIOD_OPTIONS = [
  { label: "1달", months: 1 },
  { label: "3달", months: 3 },
  { label: "6달", months: 6 },
  { label: "1년", months: 12 },
  { label: "전체", months: 0, divider: true },
] as const;

// ─── Skeleton Loading ───────────────────────

function OverviewSkeleton() {
  return (
    <div className="p-3 md:p-4 lg:p-6 space-y-2.5 md:space-y-3">
      <div className="flex items-center justify-between">
        <div className="skeleton h-7 w-24" />
        <div className="skeleton h-9 w-56" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <div className="col-span-2 skeleton h-[100px]" />
        <div className="skeleton h-[80px] md:h-[100px]" />
        <div className="skeleton h-[80px] md:h-[100px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3">
        <div className="md:col-span-2 skeleton h-[150px] md:h-[170px]" />
        <div className="skeleton h-[150px] md:h-[170px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
        <div className="skeleton h-[150px]" />
        <div className="skeleton h-[100px] md:h-[150px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3">
        <div className="skeleton h-[180px]" />
        <div className="skeleton h-[180px]" />
        <div className="space-y-2.5">
          <div className="skeleton h-[120px]" />
          <div className="skeleton h-[90px]" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────

export default function OverviewPage() {
  const { records, shoes, loading } = useDashboard();
  const [periodMonths, setPeriodMonths] = useState(3);
  const [shoeLogs, setShoeLogs] = useState<ShoeDistanceLog[]>([]);

  useEffect(() => {
    if (!loading && shoes.length > 0) {
      supabase
        .from("shoe_distance_logs")
        .select("*")
        .then(({ data }) => { if (data) setShoeLogs(data); });
    }
  }, [loading, shoes.length]);

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const dayOfMonth = now.getDate();

  // Animation key: changes when period changes → re-triggers number-reveal on dynamic values
  const ak = `p${periodMonths}`;

  const filtered = useMemo(() => {
    if (periodMonths === 0) return records;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - periodMonths, now.getDate());
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return records.filter((r) => r.date >= cutoffStr);
  }, [records, periodMonths, today]);

  const previousFiltered = useMemo(() => {
    if (periodMonths === 0) return [];
    const currentCutoff = new Date(now.getFullYear(), now.getMonth() - periodMonths, now.getDate());
    const previousCutoff = new Date(now.getFullYear(), now.getMonth() - periodMonths * 2, now.getDate());
    const currentStr = currentCutoff.toISOString().split("T")[0];
    const previousStr = previousCutoff.toISOString().split("T")[0];
    return records.filter((r) => r.date >= previousStr && r.date < currentStr);
  }, [records, periodMonths, today]);

  // ─── PR Calculation (all-time) ─────────────
  const personalRecords = useMemo(() => {
    return PR_DISTANCES.map((dist) => {
      const matching = records.filter((r) => {
        if (!r.distance_km || !r.duration) return false;
        return r.distance_km >= dist.min && r.distance_km <= dist.max;
      });

      let best: { time: string; pace: string; date: string } | null = null;
      let bestSec = Infinity;

      for (const r of matching) {
        const sec = parseDurationToSeconds(r.duration);
        if (sec !== null && sec < bestSec) {
          bestSec = sec;
          const pacePerKm = sec / (r.distance_km ?? 1);
          best = {
            time: formatDuration(sec),
            pace: formatPaceColon(pacePerKm),
            date: r.date,
          };
        }
      }

      return { label: dist.label, best };
    });
  }, [records]);

  // ─── Total Time ───────────────────────────
  const totalTimeSec = useMemo(() => {
    return filtered.reduce((sum, r) => {
      const sec = parseDurationToSeconds(r.duration);
      return sum + (sec ?? 0);
    }, 0);
  }, [filtered]);

  // ─── Shoe Mileage ──────────────────────────
  const shoeData = useMemo(() => {
    return shoes
      .filter((s) => s.status === "active")
      .map((shoe) => {
        const logDist = shoeLogs
          .filter((l) => l.shoe_id === shoe.id)
          .reduce((s, l) => s + l.distance_km, 0);
        const linkedDist = records
          .filter((r) => r.shoe_id === shoe.id && r.distance_km)
          .reduce((s, r) => s + (r.distance_km ?? 0), 0);
        const total = shoe.initial_distance_km + logDist + linkedDist;
        const pct = Math.min((total / shoe.max_distance_km) * 100, 100);
        return { shoe, total, pct, isWarning: pct >= 80 };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [shoes, shoeLogs, records]);

  if (loading) {
    return <OverviewSkeleton />;
  }

  // ─── Stats ─────────────────────────────────
  const totalDistance = filtered.reduce((s, r) => s + (r.distance_km ?? 0), 0);
  const totalRuns = filtered.length;
  const paces = filtered
    .map((r) => {
      const sec = parsePaceToSeconds(r.pace_minkm);
      if (sec && sec > 60) return sec;
      if (r.pace_kmh && r.pace_kmh > 0) return 3600 / r.pace_kmh;
      return null;
    })
    .filter((p): p is number => p !== null && p > 60);
  const avgPaceSec = paces.length > 0
    ? paces.reduce((a, b) => a + b, 0) / paces.length
    : null;
  const avgPace = avgPaceSec ? formatPace(avgPaceSec) : "-";
  const avgKmh = avgPaceSec ? (3600 / avgPaceSec).toFixed(1) : null;
  const hearts = filtered
    .map((r) => r.avg_heart_rate)
    .filter((h): h is number => h !== null && !isNaN(h) && h > 0);
  const avgHeart = hearts.length > 0
    ? Math.round(hearts.reduce((a, b) => a + b, 0) / hearts.length)
    : null;
  const maxHeart = hearts.length > 0 ? Math.max(...hearts) : null;

  // Previous period stats
  const prevDistance = previousFiltered.reduce((s, r) => s + (r.distance_km ?? 0), 0);
  const prevRuns = previousFiltered.length;
  const prevPaces = previousFiltered
    .map((r) => {
      const sec = parsePaceToSeconds(r.pace_minkm);
      if (sec && sec > 60) return sec;
      if (r.pace_kmh && r.pace_kmh > 0) return 3600 / r.pace_kmh;
      return null;
    })
    .filter((p): p is number => p !== null && p > 60);
  const prevAvgPaceSec = prevPaces.length > 0
    ? prevPaces.reduce((a, b) => a + b, 0) / prevPaces.length
    : null;

  // Deltas (%)
  const distDelta = prevDistance > 0 ? ((totalDistance - prevDistance) / prevDistance) * 100 : null;
  const runsDelta = prevRuns > 0 ? ((totalRuns - prevRuns) / prevRuns) * 100 : null;
  const paceDelta = avgPaceSec && prevAvgPaceSec
    ? ((prevAvgPaceSec - avgPaceSec) / prevAvgPaceSec) * 100
    : null;

  // ─── This month vs last month ─────────────
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const thisMonthRecords = records.filter((r) => {
    if (!r.date.startsWith(thisMonthKey)) return false;
    const d = parseInt(r.date.substring(8, 10));
    return d <= dayOfMonth;
  });
  const lastMonthSamePeriod = records.filter((r) => {
    if (!r.date.startsWith(lastMonthKey)) return false;
    const d = parseInt(r.date.substring(8, 10));
    return d <= dayOfMonth;
  });
  const lastMonthFull = records.filter((r) => r.date.startsWith(lastMonthKey));

  const thisMonthDist = thisMonthRecords.reduce((s, r) => s + (r.distance_km ?? 0), 0);
  const lastMonthSameDist = lastMonthSamePeriod.reduce((s, r) => s + (r.distance_km ?? 0), 0);
  const lastMonthFullDist = lastMonthFull.reduce((s, r) => s + (r.distance_km ?? 0), 0);
  const monthDistDelta = lastMonthSameDist > 0
    ? ((thisMonthDist - lastMonthSameDist) / lastMonthSameDist) * 100
    : null;

  // ─── Weekly data ────────────────────────────
  const weekCount = periodMonths === 1 ? 5 : periodMonths === 3 ? 12 : periodMonths === 6 ? 16 : 12;
  const weeks: { month: string; distance: number; runs: number; startDate: string }[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startStr = weekStart.toISOString().split("T")[0];
    const endStr = weekEnd.toISOString().split("T")[0];
    const weekRecords = records.filter((r) => r.date >= startStr && r.date <= endStr);
    const dist = weekRecords.reduce((s, r) => s + (r.distance_km ?? 0), 0);

    weeks.push({
      month: `${weekStart.getMonth() + 1}월`,
      distance: Math.round(dist * 10) / 10,
      runs: weekRecords.length,
      startDate: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
    });
  }
  const maxWeekDist = Math.max(...weeks.map((w) => w.distance), 1);

  // ─── Monthly data ─────────────────────────
  const monthCount = periodMonths === 0 ? 12 : Math.min(periodMonths, 12);
  const months: { key: string; label: string; distance: number; runs: number }[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthRecords = records.filter((r) => r.date.startsWith(key));
    const dist = monthRecords.reduce((s, r) => s + (r.distance_km ?? 0), 0);
    months.push({
      key,
      label: `${d.getMonth() + 1}월`,
      distance: Math.round(dist * 10) / 10,
      runs: monthRecords.length,
    });
  }
  const maxMonthDist = Math.max(...months.map((m) => m.distance), 1);

  // ─── Exercise types ───────────────────────
  const typeCounts = new Map<string, number>();
  for (const r of filtered) {
    typeCounts.set(r.exercise_type, (typeCounts.get(r.exercise_type) ?? 0) + 1);
  }
  const typeEntries = Array.from(typeCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const typeMax = typeEntries[0]?.[1] ?? 1;

  // ─── Recent runs ──────────────────────────
  const recentRuns = filtered.slice(0, 5);

  // ─── Day of week ──────────────────────────
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const r of filtered) {
    const d = new Date(r.date + "T00:00:00");
    dayOfWeekCounts[d.getDay()]++;
  }
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const maxDayCount = Math.max(...dayOfWeekCounts, 1);

  const periodLabel = periodMonths === 0 ? "전체" : (PERIOD_OPTIONS.find(o => o.months === periodMonths)?.label ?? `${periodMonths}달`);

  // ─── Render ───────────────────────────────

  return (
    <div className="p-3 md:p-4 lg:p-6 space-y-2.5 md:space-y-3">
      {/* ═══ Header + Period Selector ════════════ */}
      <div className="card-reveal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" style={{ animationDelay: "0ms" }}>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          오버뷰
        </h1>
        <div className="flex items-center gap-0.5 bg-card rounded-lg p-1 border border-border">
          {PERIOD_OPTIONS.map((opt) => (
            <div key={opt.months} className="flex items-center gap-0.5">
              {"divider" in opt && opt.divider && (
                <div className="w-px h-4 bg-border mx-0.5" />
              )}
              <button
                onClick={() => setPeriodMonths(opt.months)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  periodMonths === opt.months
                    ? "bg-accent text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Hero Card + Stat Cards ══════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        {/* Hero: 총 거리 + 총 러닝 + 총 시간 */}
        <div
          className="col-span-2 rounded-xl border border-accent/15 p-4 card-reveal relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--accent-bar-subtle) 0%, var(--accent-gradient-end) 70%)",
            animationDelay: "40ms",
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Route className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-medium text-muted">총 거리 · 총 러닝 · 총 시간</span>
            </div>

            <div className="flex items-baseline gap-3 md:gap-4">
              <p key={`dist-${ak}`} className="number-reveal" style={{ animationDelay: "200ms" }}>
                <span className="text-2xl md:text-3xl font-bold font-mono text-accent leading-none">
                  {Math.round(totalDistance).toLocaleString()}
                </span>
                <span className="text-sm font-normal text-muted ml-1">km</span>
              </p>

              <div className="h-6 w-px bg-border/50" />

              <p key={`runs-${ak}`} className="number-reveal" style={{ animationDelay: "280ms" }}>
                <span className="text-base md:text-lg font-bold font-mono text-foreground leading-none">
                  {totalRuns}
                </span>
                <span className="text-xs font-normal text-muted ml-1">회</span>
              </p>

              <div className="h-6 w-px bg-border/50" />

              <p key={`time-${ak}`} className="number-reveal" style={{ animationDelay: "320ms" }}>
                <span className="text-base md:text-lg font-bold font-mono text-foreground leading-none">
                  {Math.floor(totalTimeSec / 3600)}:{Math.floor((totalTimeSec % 3600) / 60).toString().padStart(2, "0")}
                </span>
                <span className="text-xs font-normal text-muted ml-1">시간</span>
              </p>
            </div>

            {/* 전기간 비교 */}
            {prevDistance > 0 && (
              <div key={`cmp-${ak}`} className="mt-2.5 pt-2 border-t border-accent/10 flex items-center gap-3 md:gap-4 text-[10px] md:text-[11px] font-mono number-reveal overflow-x-auto scrollbar-hide" style={{ animationDelay: "350ms" }}>
                <span className="text-muted">vs {periodMonths === 1 ? "지난달" : periodMonths === 12 ? "전년" : `이전 ${periodLabel}`}</span>
                {Math.round(totalDistance - prevDistance) === 0 && Math.round(distDelta ?? 0) === 0 ? (
                  <span className="text-muted">거리 동일</span>
                ) : (
                  <span className={distDelta != null && distDelta > 0 ? "text-accent" : distDelta != null && distDelta < 0 ? "text-red-400" : "text-muted"}>
                    {distDelta != null && distDelta > 0 ? "+" : ""}{Math.round(totalDistance - prevDistance)}km
                    <span className="text-muted ml-0.5">({distDelta != null && distDelta > 0 ? "+" : ""}{Math.round(distDelta ?? 0)}%)</span>
                  </span>
                )}
                {totalRuns - prevRuns === 0 && Math.round(runsDelta ?? 0) === 0 ? (
                  <span className="text-muted">횟수 동일</span>
                ) : (
                  <span className={runsDelta != null && runsDelta > 0 ? "text-accent" : runsDelta != null && runsDelta < 0 ? "text-red-400" : "text-muted"}>
                    {runsDelta != null && runsDelta > 0 ? "+" : ""}{totalRuns - prevRuns}회
                    <span className="text-muted ml-0.5">({runsDelta != null && runsDelta > 0 ? "+" : ""}{Math.round(runsDelta ?? 0)}%)</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 평균 페이스 */}
        <div
          className="rounded-xl border border-border bg-card p-3.5 card-reveal"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Timer className="h-3 w-3 text-muted" />
            <span className="text-[11px] font-medium text-muted">평균 페이스</span>
          </div>
          <div key={`pace-${ak}`} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 number-reveal" style={{ animationDelay: "320ms" }}>
            <p>
              <span className="text-xl font-bold font-mono text-foreground leading-none">
                {avgPace}
              </span>
              <span className="text-xs font-normal text-muted ml-0.5">/km</span>
            </p>
            {avgKmh && (
              <p>
                <span className="text-base font-bold font-mono text-muted leading-none">
                  {avgKmh}
                </span>
                <span className="text-[10px] font-normal text-muted ml-0.5">km/h</span>
              </p>
            )}
          </div>
          {paceDelta != null && (
            <div className="mt-1.5">
              <DeltaBadge delta={paceDelta} label={paceDelta >= 0 ? "개선" : "하락"} size="sm" />
            </div>
          )}
        </div>

        {/* 심박 */}
        <div
          className="rounded-xl border border-border bg-card p-3.5 card-reveal"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="h-3 w-3 text-red-400/80" />
            <span className="text-[11px] font-medium text-muted">심박</span>
          </div>
          <div key={`hr-${ak}`} className="space-y-1.5">
            <div className="flex items-baseline gap-1.5 number-reveal" style={{ animationDelay: "360ms" }}>
              <span className="text-[10px] text-muted w-6">평균</span>
              <span className="text-xl font-bold font-mono text-foreground leading-none">
                {avgHeart?.toString() ?? "-"}
              </span>
              <span className="text-[10px] font-normal text-muted">bpm</span>
            </div>
            {maxHeart && (
              <div className="flex items-baseline gap-1.5 number-reveal" style={{ animationDelay: "400ms" }}>
                <span className="text-[10px] text-muted w-6">최고</span>
                <span className="text-base font-bold font-mono text-red-400 leading-none">
                  {maxHeart}
                </span>
                <span className="text-[10px] font-normal text-muted">bpm</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Charts Row ══════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3">
        {/* Weekly Distance Chart */}
        <div
          className="md:col-span-2 rounded-xl border border-border bg-card p-3 md:p-4 card-reveal"
          style={{ animationDelay: "160ms" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">주간 거리</h3>
            <span className="text-xs font-mono text-muted">최근 {weekCount}주</span>
          </div>
          {(() => {
            const chartH = 110;
            const barArea = chartH - 18;
            const niceMax = Math.ceil(maxWeekDist / 10) * 10 || 10;
            const gridLines = [0, Math.round(niceMax / 2), niceMax];

            return (
              <div key={`wk-${ak}`} className="flex" style={{ height: chartH }}>
                {/* Y-axis */}
                <div className="flex flex-col justify-between pr-3 pb-5 shrink-0" style={{ height: barArea }}>
                  {[...gridLines].reverse().map((v) => (
                    <span key={v} className="text-[11px] font-mono text-muted leading-none w-7 text-right">
                      {v}
                    </span>
                  ))}
                </div>

                {/* Chart */}
                <div className="flex-1 relative">
                  {gridLines.map((v) => (
                    <div
                      key={v}
                      className="absolute left-0 right-0 border-t border-muted/20"
                      style={{ bottom: `${(v / niceMax) * barArea + 20}px` }}
                    />
                  ))}

                  <div className="flex items-end gap-2 h-full relative z-10">
                    {weeks.map((w, i) => {
                      const prevMonth = i > 0 ? weeks[i - 1].month : "";
                      const showLabel = w.month !== prevMonth;
                      const barH = Math.max((w.distance / niceMax) * barArea, w.distance > 0 ? 4 : 0);
                      const isLatest = i === weeks.length - 1;

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group relative">
                          <div
                            className="w-full rounded-sm bar-grow"
                            style={{
                              height: barH,
                              animationDelay: `${400 + i * 40}ms`,
                              background: isLatest
                                ? "var(--accent-solid)"
                                : w.distance > 0
                                ? "var(--accent-bar)"
                                : "var(--bar-empty)",
                              boxShadow: isLatest ? "0 0 12px var(--accent-glow)" : "none",
                            }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            <div className="bg-foreground text-background text-xs font-mono px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                              {w.startDate} · {w.distance}km · {w.runs}회
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-muted shrink-0 h-4">
                            {showLabel ? w.month : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* This Month Card */}
        <div
          className="rounded-xl border border-border bg-card p-3.5 flex flex-col card-reveal"
          style={{ animationDelay: "200ms" }}
        >
          <h3 className="text-sm font-bold text-foreground mb-2.5">이번 달</h3>

          <div className="flex-1 flex flex-col justify-center">
            <p className="number-reveal" style={{ animationDelay: "400ms" }}>
              <span className="text-2xl font-bold text-accent font-mono leading-none">
                {Math.round(thisMonthDist * 10) / 10}
              </span>
              <span className="text-xs font-normal text-muted ml-1">km</span>
            </p>
            <p className="text-xs text-muted mt-1 font-mono">
              {thisMonthRecords.length}회 러닝
            </p>
            {monthDistDelta !== null && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-mono ${
                Math.round(monthDistDelta) === 0
                  ? "text-muted"
                  : monthDistDelta > 0
                  ? "text-accent"
                  : "text-red-400"
              }`}>
                {Math.round(monthDistDelta) === 0 ? (
                  <Minus className="h-3.5 w-3.5" />
                ) : monthDistDelta > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>
                  {Math.round(monthDistDelta) === 0
                    ? "지난달 동기간과 동일"
                    : `${monthDistDelta > 0 ? "+" : ""}${Math.round(monthDistDelta)}% vs 지난달 동기간`}
                </span>
              </div>
            )}
          </div>

          {lastMonthFullDist > 0 && (
            <div className="mt-2.5 pt-2 border-t border-border/50">
              <div className="flex justify-between text-[10px] text-muted mb-1.5">
                <span>지난달 대비 진행률</span>
                <span className="font-mono">{Math.round((thisMonthDist / lastMonthFullDist) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full progress-fill"
                  style={{
                    width: `${Math.min((thisMonthDist / lastMonthFullDist) * 100, 100)}%`,
                    animationDelay: "600ms",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-muted mt-1.5">
                <span>1~{dayOfMonth}일: {Math.round(lastMonthSameDist * 10) / 10}km</span>
                <span>전체: {Math.round(lastMonthFullDist * 10) / 10}km</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ PR Row ══════════════════════════════ */}
      <div className={`grid grid-cols-1 ${shoeData.length > 0 ? "md:grid-cols-2" : ""} gap-2.5 md:gap-3`}>
        {/* PR Card */}
        <div
          className="rounded-xl border border-border bg-card p-4 card-reveal"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-3.5 w-3.5 text-accent" />
            <h3 className="text-sm font-bold text-foreground">개인 기록 (PR)</h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {personalRecords.map((pr) => (
              <div
                key={pr.label}
                className={`rounded-lg border p-2 text-center ${
                  pr.best
                    ? "border-accent/15 bg-accent/5"
                    : "border-dashed border-border/50"
                }`}
              >
                <div className="text-[10px] text-muted mb-1">{pr.label}</div>
                <div
                  className={`text-sm font-mono font-bold ${
                    pr.best ? "text-foreground" : "text-muted"
                  }`}
                >
                  {pr.best?.time ?? "—"}
                </div>
                {pr.best ? (
                  <div className="text-[11px] text-accent font-mono mt-1">
                    {pr.best.pace}/km
                  </div>
                ) : (
                  <div className="text-[11px] text-muted mt-1">미기록</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shoe Mileage Card */}
        {shoeData.length > 0 && (
          <div
            className="rounded-xl border border-border bg-card p-4 card-reveal"
            style={{ animationDelay: "220ms" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Footprints className="h-3.5 w-3.5 text-accent" />
                <h3 className="text-sm font-bold text-foreground">신발 마일리지</h3>
              </div>
              <Link
                href="/dashboard/shoes"
                className="text-[11px] text-muted hover:text-accent transition-colors font-mono"
              >
                관리 →
              </Link>
            </div>
            <div className="space-y-2.5">
              {shoeData.map(({ shoe, total, pct, isWarning }) => (
                <div key={shoe.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground font-medium truncate">{shoe.name}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isWarning && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                      <span className="text-[11px] font-mono text-muted">
                        {Math.round(total)} / {shoe.max_distance_km}km
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full progress-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isWarning ? "#fbbf24" : "var(--accent-solid)",
                        animationDelay: "600ms",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Bottom Row ══════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3">
        {/* Monthly Trend */}
        <div
          className="rounded-xl border border-border bg-card p-4 card-reveal"
          style={{ animationDelay: "240ms" }}
        >
          <h3 className="text-sm font-bold text-foreground mb-3">월별 추이</h3>
          <div key={`mo-${ak}`} className="space-y-2">
            {months.map((m, i) => (
              <div key={m.key} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted w-8 text-right shrink-0">
                  {m.label}
                </span>
                <div className="flex-1 h-5 bg-border/20 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm bar-grow"
                    style={{
                      width: `${Math.max((m.distance / maxMonthDist) * 100, m.distance > 0 ? 2 : 0)}%`,
                      transformOrigin: "left",
                      animationName: "bar-grow",
                      animationDuration: "0.6s",
                      animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                      animationFillMode: "forwards",
                      animationDelay: `${500 + i * 50}ms`,
                      transform: "scaleX(0)",
                      background:
                        m.key === thisMonthKey
                          ? "var(--accent-solid)"
                          : "var(--accent-bar)",
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-muted w-16 text-right shrink-0">
                  {m.distance}<span className="text-muted">km</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Runs */}
        <div
          className="rounded-xl border border-border bg-card p-4 card-reveal"
          style={{ animationDelay: "280ms" }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">최근 기록</h3>
            <span className="text-xs font-mono text-muted">
              {periodMonths === 0 ? "전체" : `최근 ${periodLabel}`}
            </span>
          </div>
          <div key={`rec-${ak}`}>
            {recentRuns.map((r, i) => {
              const typeColor = getTypeStyle(r.exercise_type).bar;

              return (
                <div
                  key={r.id}
                  className="flex items-center gap-2.5 py-2 border-b border-border/30 last:border-0 card-reveal"
                  style={{ animationDelay: `${500 + i * 60}ms` }}
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: typeColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">
                      {new Date(r.date + "T00:00:00").toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </p>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <span className="text-xs text-muted">{r.exercise_type}</span>
                      {r.pace_minkm ? (
                        <>
                          <span className="text-xs font-mono text-foreground/80">{r.pace_minkm}<span className="text-muted ml-0.5">/km</span></span>
                          {paceToKmh(r.pace_minkm) && (
                            <span className="text-[11px] font-mono text-muted">{paceToKmh(r.pace_minkm)}<span className="text-muted ml-0.5">km/h</span></span>
                          )}
                        </>
                      ) : r.pace_kmh ? (
                        <>
                          <span className="text-xs font-mono text-foreground/80">{r.pace_kmh}<span className="text-muted ml-0.5">km/h</span></span>
                          <span className="text-[11px] font-mono text-muted">{kmhToMinKm(r.pace_kmh)}<span className="text-muted ml-0.5">/km</span></span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-accent font-mono shrink-0">
                    {r.distance_km ?? "-"}
                    <span className="text-xs text-muted font-normal ml-0.5">km</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Types + Days */}
        <div className="flex flex-col gap-2.5">
          {/* Exercise Types */}
          <div
            className="rounded-xl border border-border bg-card p-4 flex-1 card-reveal"
            style={{ animationDelay: "320ms" }}
          >
            <h3 className="text-sm font-bold text-foreground mb-2.5">운동 유형</h3>
            <div key={`ty-${ak}`} className="space-y-2.5">
              {typeEntries.map(([type, count]) => {
                const color = getTypeStyle(type).bar;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-foreground">{type}</span>
                      </div>
                      <span className="text-xs font-mono text-muted">{count}회</span>
                    </div>
                    <div className="h-1.5 bg-border/20 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full progress-fill"
                        style={{
                          width: `${(count / typeMax) * 100}%`,
                          backgroundColor: color,
                          opacity: 0.4,
                          animationDelay: "700ms",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day of Week */}
          <div
            className="rounded-xl border border-border bg-card p-4 card-reveal"
            style={{ animationDelay: "360ms" }}
          >
            <h3 className="text-sm font-bold text-foreground mb-2.5">요일별 빈도</h3>
            {(() => {
              const chartH = 90;
              const barArea = chartH - 18;
              const niceMax = Math.ceil(maxDayCount / 5) * 5 || 5;
              const gridLines = [0, Math.round(niceMax / 2), niceMax];

              return (
                <div key={`dw-${ak}`} className="flex" style={{ height: chartH }}>
                  {/* Y-axis */}
                  <div className="flex flex-col justify-between pr-2 pb-5 shrink-0" style={{ height: barArea }}>
                    {[...gridLines].reverse().map((v) => (
                      <span key={v} className="text-[11px] font-mono text-muted leading-none w-5 text-right">
                        {v}
                      </span>
                    ))}
                  </div>

                  {/* Chart */}
                  <div className="flex-1 relative">
                    {gridLines.map((v) => (
                      <div
                        key={v}
                        className="absolute left-0 right-0 border-t border-muted/20"
                        style={{ bottom: `${(v / niceMax) * barArea + 20}px` }}
                      />
                    ))}

                    <div className="flex items-end gap-2 h-full relative z-10">
                      {dayOfWeekCounts.map((count, i) => {
                        const isMax = count === Math.max(...dayOfWeekCounts);
                        const barH = Math.max((count / niceMax) * barArea, count > 0 ? 2 : 0);

                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group relative">
                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <span className="text-[11px] font-mono text-accent">{count}</span>
                            </div>
                            <div
                              className="w-full rounded-sm bar-grow"
                              style={{
                                height: barH,
                                animationDelay: `${600 + i * 50}ms`,
                                background: isMax
                                  ? "var(--accent-solid)"
                                  : count > 0
                                  ? "var(--accent-glow)"
                                  : "var(--bar-empty)",
                                boxShadow: isMax ? "0 0 8px var(--accent-glow)" : "none",
                              }}
                            />
                            <span className={`text-[11px] font-mono ${isMax ? "text-accent font-bold" : "text-muted"}`}>
                              {dayLabels[i]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────

function DeltaBadge({
  delta,
  label,
  size = "default",
}: {
  delta: number | null;
  label?: string;
  size?: "sm" | "default";
}) {
  if (delta == null) return null;

  const rounded = Math.round(delta);
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  if (rounded === 0) {
    return (
      <span className={`ml-auto inline-flex items-center gap-0.5 font-mono text-muted ${textSize}`}>
        <Minus className={iconSize} />
        동일
      </span>
    );
  }

  const isPositive = delta > 0;
  const colorClass = isPositive ? "text-accent" : "text-red-400";
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const text = `${isPositive ? "+" : ""}${rounded}%${label ? ` ${label}` : ""}`;

  return (
    <span className={`ml-auto inline-flex items-center gap-0.5 font-mono ${colorClass} ${textSize}`}>
      <Icon className={iconSize} />
      {text}
    </span>
  );
}
