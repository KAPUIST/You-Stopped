"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useDashboard } from "../../context";
import { getTypeStyle, getTagStyle } from "../../constants";
import { ArrowLeft, Loader2, Trophy, Footprints } from "lucide-react";
import { StravaIcon } from "@/components/icons/StravaIcon";

// ─── Types ──────────────────────────────────────

interface DetailedRecord {
  id: string;
  date: string;
  exercise_type: string;
  distance_km: number | null;
  duration: string | null;
  pace_kmh: number | null;
  pace_minkm: string | null;
  cadence: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  notes: string | null;
  shoe_id: string | null;
  tags: string[];
  source: string;
  source_id: string | null;
  calories: number | null;
  elevation_gain: number | null;
  suffer_score: number | null;
  max_speed: number | null;
  elapsed_time: string | null;
  avg_temp: number | null;
  map_polyline: string | null;
}

interface Split {
  split_num: number;
  distance_m: number;
  elapsed_time: number;
  moving_time: number | null;
  avg_speed: number | null;
  avg_heartrate: number | null;
  elevation_diff: number | null;
  pace_zone: number | null;
}

interface BestEffort {
  name: string;
  distance: number;
  elapsed_time: number;
  moving_time: number | null;
  pr_rank: number | null;
}

interface StreamData {
  time: number[];
  distance?: number[];
  heartrate?: number[];
  altitude?: number[];
  velocity_smooth?: number[];
  cadence?: number[];
  grade_smooth?: number[];
  latlng?: number[][];
}

// ─── Utilities ──────────────────────────────────

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function fmtDuration(dur: string | null): string {
  if (!dur) return "-";
  const parts = dur.split(":");
  if (parts.length === 3) {
    const h = parseInt(parts[0]);
    const m = parts[1].padStart(2, "0");
    const s = parts[2].split(".")[0].padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }
  return dur;
}

function durToSeconds(dur: string | null): number | null {
  if (!dur) return null;
  const parts = dur.split(":");
  if (parts.length !== 3) return null;
  const [h, m, s] = parts.map((p) => parseInt(p.split(".")[0]));
  if ([h, m, s].some(isNaN)) return null;
  return h * 3600 + m * 60 + s;
}

function fmtSeconds(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}'${sec.toString().padStart(2, "0")}"`;
}

function splitPaceSec(s: Split): number {
  if (s.avg_speed && s.avg_speed > 0) return 1000 / s.avg_speed;
  if (s.moving_time && s.distance_m > 0) return (s.moving_time / s.distance_m) * 1000;
  return Infinity;
}

/** 눈금 간격 계산 — 보기 좋은 라운드 숫자로 */
function niceStep(range: number, targetTicks: number = 4): number {
  if (range <= 0) return 1;
  const rough = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const nice = norm <= 1.5 ? 1 : norm <= 3 ? 2 : norm <= 7 ? 5 : 10;
  return nice * mag;
}

/** Moving average smoother — reduces noise in stream data for clearer charts */
function smoothData(data: number[], windowSize: number): number[] {
  const half = Math.floor(windowSize / 2);
  return data.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(data.length, i + half + 1);
    let sum = 0, count = 0;
    for (let j = start; j < end; j++) {
      if (data[j] != null && isFinite(data[j])) { sum += data[j]; count++; }
    }
    return count > 0 ? sum / count : data[i];
  });
}

/** Compute pace zone from pace relative to average when Strava zone is null */
function computePaceZone(pace: number, avgPace: number): number {
  const ratio = pace / avgPace;
  if (ratio <= 0.90) return 5; // much faster → VO2max
  if (ratio <= 0.95) return 4; // faster → threshold
  if (ratio <= 1.05) return 3; // around avg → tempo
  if (ratio <= 1.15) return 2; // slower → endurance
  return 1;                     // much slower → recovery
}

/** Pace zone color — higher zone = faster pace */
const ZONE_COLORS: Record<number, string> = {
  1: "#94a3b8", // recovery — slate
  2: "#38bdf8", // endurance — sky
  3: "var(--accent-solid)", // tempo — accent
  4: "#f97316", // threshold — orange
  5: "#ef4444", // VO2max — red
};

function zoneColor(zone: number | null): string {
  if (!zone || zone < 1 || zone > 5) return "var(--accent-solid)";
  return ZONE_COLORS[zone];
}

/** Decode Google polyline to lat/lng pairs */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// ─── Main Page ──────────────────────────────────

export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { shoes } = useDashboard();
  const id = params.id as string;

  const [record, setRecord] = useState<DetailedRecord | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [bestEfforts, setBestEfforts] = useState<BestEffort[]>([]);
  const [streams, setStreams] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [recordRes, splitsRes, effortsRes, streamsRes] = await Promise.all([
        supabase.from("running_records").select("*").eq("id", id).single(),
        supabase.from("activity_splits").select("*").eq("record_id", id).order("split_num"),
        supabase.from("activity_best_efforts").select("*").eq("record_id", id).order("distance"),
        supabase.from("activity_streams").select("stream_data").eq("record_id", id).maybeSingle(),
      ]);

      if (recordRes.error || !recordRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setRecord(recordRes.data as DetailedRecord);
      setSplits(splitsRes.data ?? []);
      setBestEfforts(effortsRes.data ?? []);
      if (streamsRes.data?.stream_data) {
        setStreams(streamsRes.data.stream_data as StreamData);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const shoe = useMemo(
    () => (record?.shoe_id ? shoes.find((s) => s.id === record.shoe_id) : null),
    [record?.shoe_id, shoes],
  );

  const prs = useMemo(
    () => bestEfforts.filter((e) => e.pr_rank != null && e.pr_rank <= 3),
    [bestEfforts],
  );

  if (loading) return <DetailSkeleton />;
  if (notFound || !record) return <NotFoundView onBack={() => router.push("/dashboard/records")} />;

  const ts = getTypeStyle(record.exercise_type);
  const d = new Date(record.date + "T00:00:00");
  const dateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* ═══ Back ═══ */}
      <button
        onClick={() => router.push("/dashboard/records")}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6 group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        기록 목록
      </button>

      {/* ═══ Hero ═══ */}
      <section
        className="rounded-2xl border border-border bg-card p-5 md:p-8 mb-4 card-reveal relative overflow-hidden"
        style={{ animationDelay: "0ms" }}
      >
        {/* Accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[200px] w-[300px] rounded-full blur-[80px] pointer-events-none" style={{ background: "rgba(var(--accent-rgb), 0.08)" }} />

        {/* Date + Type */}
        <div className="relative flex items-center gap-2 mb-4">
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${ts.badge}`}>
            {record.exercise_type}
          </span>
          <span className="text-sm text-muted">{dateLabel}</span>
          {record.source === "strava" && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FC4C02]/10 border border-[#FC4C02]/20">
              <StravaIcon size={16} style={{ color: "#FC4C02" }} />
              <span className="text-[11px] font-semibold text-[#FC4C02]">Strava</span>
            </span>
          )}
        </div>

        {/* Activity name */}
        {record.notes && (
          <h1 className="relative text-lg md:text-xl font-bold text-foreground mb-5 leading-snug">
            {record.notes}
          </h1>
        )}

        {/* BIG 3 */}
        <div className="relative grid grid-cols-3 gap-4 md:gap-8 lg:max-w-3xl">
          <div>
            <p className="text-3xl md:text-4xl lg:text-5xl font-black font-mono text-accent tracking-tight number-reveal" style={{ animationDelay: "100ms" }}>
              {record.distance_km != null ? record.distance_km : "-"}
            </p>
            <p className="text-xs text-muted mt-1.5">거리 km</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl lg:text-5xl font-black font-mono text-foreground tracking-tight number-reveal" style={{ animationDelay: "200ms" }}>
              {fmtDuration(record.duration)}
            </p>
            <p className="text-xs text-muted mt-1.5">시간</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl lg:text-5xl font-black font-mono text-foreground tracking-tight number-reveal" style={{ animationDelay: "300ms" }}>
              {record.pace_minkm ?? "-"}
            </p>
            <p className="text-xs text-muted mt-1.5">페이스 /km</p>
          </div>
        </div>

        {/* Sub Metrics */}
        <div className="relative flex items-center gap-2 mt-6 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {record.calories != null && (
            <MetricPill label="칼로리" value={Math.round(record.calories)} unit="kcal" />
          )}
          {record.elevation_gain != null && (
            <MetricPill label="고도 상승" value={Math.round(record.elevation_gain)} unit="m" />
          )}
          {record.max_heart_rate != null && (
            <MetricPill label="최고 심박" value={record.max_heart_rate} unit="bpm" />
          )}
          {record.max_speed != null && (
            <MetricPill label="최고 속도" value={record.max_speed} unit="km/h" />
          )}
          {record.suffer_score != null && (
            <MetricPill label="고통 지수" value={record.suffer_score} />
          )}
          {record.cadence != null && (
            <MetricPill label="케이던스" value={record.cadence} unit="spm" />
          )}
          {record.avg_heart_rate != null && (
            <MetricPill label="평균 심박" value={record.avg_heart_rate} unit="bpm" />
          )}
          {record.avg_temp != null && (
            <MetricPill label="온도" value={record.avg_temp} unit="°C" />
          )}
          {record.pace_kmh != null && (
            <MetricPill label="평균 속도" value={record.pace_kmh} unit="km/h" />
          )}
        </div>
      </section>

      {/* ═══ PR Badges ═══ */}
      {prs.length > 0 && (
        <section
          className="flex flex-wrap gap-2 mb-4 card-reveal"
          style={{ animationDelay: "50ms" }}
        >
          {prs.map((pr) => (
            <div
              key={pr.name}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-accent/25 bg-accent/5"
            >
              <Trophy className="h-4 w-4 text-accent shrink-0" />
              <div>
                <span className="text-sm font-bold text-accent">{pr.name}</span>
                <span className="text-sm font-mono text-foreground ml-2">
                  {fmtSeconds(pr.moving_time ?? pr.elapsed_time)}
                </span>
              </div>
              {pr.pr_rank === 1 && (
                <span className="text-[10px] font-bold text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                  최고 기록
                </span>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ═══ Splits (풀 와이드) ═══ */}
      <SplitsSection splits={splits} />

      {/* ═══ Heart Rate + Pace (2컬럼) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <HeartRateChart streams={streams} record={record} splits={splits} />
        <PaceChartSection streams={streams} record={record} />
      </div>

      {/* ═══ Altitude (풀 와이드) ═══ */}
      <div className="mb-4">
        <AltitudeChart streams={streams} record={record} splits={splits} />
      </div>

      {/* ═══ GPS Route (풀 와이드) ═══ */}
      <RouteSection
        polyline={record.map_polyline}
        latlng={streams?.latlng ?? null}
      />

      {/* ═══ Meta Info (풀 와이드) ═══ */}
      <MetaSection record={record} shoe={shoe} />
    </div>
  );
}

// ─── Sub Components ─────────────────────────────

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12 rounded-xl bg-surface/30 border border-dashed border-border/40">
      <p className="text-sm text-muted">{message ?? "데이터 없음"}</p>
    </div>
  );
}

function MetricPill({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-surface border border-border/50 shrink-0 min-w-[72px]">
      <span className="text-base font-bold font-mono text-foreground">
        {value}{unit && <span className="text-[10px] text-muted font-normal ml-0.5">{unit}</span>}
      </span>
      <span className="text-[10px] text-muted mt-0.5">{label}</span>
    </div>
  );
}

const ZONE_LABELS: Record<number, string> = { 1: "회복", 2: "지구력", 3: "템포", 4: "역치", 5: "최대" };

function SplitsSection({ splits }: { splits: Split[] }) {
  const paces = splits.map(splitPaceSec).filter((p) => p < Infinity);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const avgPace = paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : 0;

  const fastestIdx = paces.indexOf(minPace);
  const slowestIdx = paces.indexOf(maxPace);

  // 누적 시간 계산
  const cumulativeTimes = useMemo(() => {
    let acc = 0;
    return splits.map((s) => {
      acc += s.moving_time ?? s.elapsed_time;
      return acc;
    });
  }, [splits]);

  // 페이스 일관성 분석
  const analysis = useMemo(() => {
    if (paces.length < 2) return null;
    const mean = avgPace;
    const variance = paces.reduce((sum, p) => sum + (p - mean) ** 2, 0) / paces.length;
    const stdDev = Math.sqrt(variance);
    // 전반부 vs 후반부 (네거티브 스플릿 판정)
    const half = Math.floor(paces.length / 2);
    const firstHalf = paces.slice(0, half);
    const secondHalf = paces.slice(half);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const isNegative = secondAvg < firstAvg;

    let consistency: string;
    if (stdDev < 10) consistency = "매우 일정한 페이스";
    else if (stdDev < 20) consistency = "안정적인 페이스";
    else if (stdDev < 40) consistency = "다소 변동이 있는 페이스";
    else consistency = "큰 페이스 변동";

    return { stdDev, consistency, isNegative, firstAvg, secondAvg };
  }, [paces, avgPace]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-4 card-reveal" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">km별 스플릿</h2>
        {splits.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
            <span>최고 <span className="text-accent font-bold">{fmtPace(minPace)}</span></span>
            <span>평균 {fmtPace(avgPace)}</span>
            <span>최저 {fmtPace(maxPace)}</span>
          </div>
        )}
      </div>

      {splits.length === 0 ? (
        <EmptyState message="스플릿 데이터 없음" />
      ) : (
        <>
          {/* ─ Zone legend ─ */}
          <div className="flex items-center gap-1 mb-4">
            <span className="text-[11px] font-medium text-muted mr-2">페이스 존</span>
            <span className="text-[11px] text-muted mr-1">빠름</span>
            {[
              { zone: 5, label: "최대" },
              { zone: 4, label: "역치" },
              { zone: 3, label: "템포" },
              { zone: 2, label: "지구력" },
              { zone: 1, label: "회복" },
            ].map(({ zone, label }) => (
              <span
                key={zone}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface text-[11px] font-medium"
                style={{ color: ZONE_COLORS[zone] }}
              >
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ZONE_COLORS[zone] }} />
                {label}
              </span>
            ))}
            <span className="text-[11px] text-muted ml-1">느림</span>
          </div>

          {/* ─ Table header ─ */}
          <div className="flex items-center gap-2 pb-2 mb-1 border-b border-border/30 text-[10px] text-muted font-medium uppercase tracking-wider">
            <span className="w-7 text-right shrink-0">km</span>
            <span className="flex-1 pl-1">페이스 바</span>
            <span className="w-14 text-right shrink-0">페이스</span>
            <span className="w-14 text-right shrink-0 hidden sm:block">구간</span>
            <span className="w-16 text-right shrink-0 hidden md:block">누적</span>
            <span className="w-12 text-right shrink-0 hidden sm:block">심박</span>
            <span className="w-12 text-right shrink-0 hidden md:block">고도</span>
            <span className="w-14 text-center shrink-0 hidden lg:block">존</span>
          </div>

          {/* ─ Split rows ─ */}
          <div className="space-y-0.5">
            {splits.map((s, i) => {
              const pace = splitPaceSec(s);
              const isValid = pace < Infinity;
              const barRatio = isValid ? minPace / pace : 0;
              const isFastest = i === fastestIdx;
              const isSlowest = i === slowestIdx;
              const zone = s.pace_zone ?? (isValid ? computePaceZone(pace, avgPace) : null);
              const color = zoneColor(zone);
              const splitTime = s.moving_time ?? s.elapsed_time;
              const gapFromAvg = isValid ? pace - avgPace : 0;

              return (
                <div
                  key={s.split_num}
                  className={`flex items-center gap-2 py-1 rounded-lg transition-colors ${
                    isFastest ? "bg-accent/5" : ""
                  }`}
                >
                  {/* km */}
                  <span className={`w-7 text-right text-xs font-mono shrink-0 ${isFastest ? "text-accent font-bold" : "text-muted"}`}>
                    {s.split_num}
                  </span>

                  {/* Pace bar — zone color */}
                  <div className="flex-1 h-7 bg-surface rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md bar-grow"
                      style={{
                        width: `${Math.max(barRatio * 100, 12)}%`,
                        background: color,
                        opacity: 0.4 + barRatio * 0.5,
                        animationDelay: `${i * 30}ms`,
                      }}
                    />
                    {/* Average line */}
                    {isValid && (
                      <div
                        className="absolute top-0 h-full w-[2px] z-10 bg-foreground/70"
                        style={{ left: `${(minPace / avgPace) * 100}%` }}
                      />
                    )}
                  </div>

                  {/* Gap from avg */}
                  <span className={`w-24 text-[11px] font-mono shrink-0 ${
                    gapFromAvg < -3 ? "text-accent" : gapFromAvg > 3 ? "text-orange-400" : "text-muted"
                  }`}>
                    {isValid && Math.abs(gapFromAvg) >= 1 ? (
                      gapFromAvg < 0 ? `▲ ${Math.abs(Math.round(gapFromAvg))}초 빠름` : `▼ ${Math.round(gapFromAvg)}초 느림`
                    ) : isValid ? "≈ 평균" : ""}
                  </span>

                  {/* Pace */}
                  <span className={`w-14 text-right text-xs font-mono font-bold shrink-0 ${
                    isFastest ? "text-accent" : isSlowest ? "text-orange-400" : "text-foreground"
                  }`}>
                    {isValid ? fmtPace(pace) : "-"}
                  </span>

                  {/* Split time */}
                  <span className="w-14 text-right text-[11px] font-mono text-muted shrink-0 hidden sm:block">
                    {fmtSeconds(splitTime)}
                  </span>

                  {/* Cumulative */}
                  <span className="w-16 text-right text-[11px] font-mono text-muted shrink-0 hidden md:block">
                    {fmtSeconds(cumulativeTimes[i])}
                  </span>

                  {/* HR */}
                  <span className="w-12 text-right text-[11px] font-mono text-muted shrink-0 hidden sm:block">
                    {s.avg_heartrate ? `${Math.round(s.avg_heartrate)}` : "-"}
                  </span>

                  {/* Elevation */}
                  <span className={`w-12 text-right text-[11px] font-mono shrink-0 hidden md:block ${
                    s.elevation_diff != null && s.elevation_diff > 0 ? "text-emerald-400" : s.elevation_diff != null && s.elevation_diff < 0 ? "text-red-400" : "text-muted"
                  }`}>
                    {s.elevation_diff != null ? `${s.elevation_diff > 0 ? "+" : ""}${Math.round(s.elevation_diff)}m` : "-"}
                  </span>

                  {/* Zone badge */}
                  <span className="w-14 shrink-0 hidden lg:flex justify-center">
                    {zone && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${color}20`, color }}
                      >
                        {ZONE_LABELS[zone] ?? `Z${zone}`}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ─ Analysis insights ─ */}
          {analysis && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {/* Pace consistency */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${analysis.stdDev < 20 ? "bg-accent" : analysis.stdDev < 40 ? "bg-yellow-400" : "bg-orange-400"}`} />
                  <span className="text-[11px] text-muted">
                    {analysis.consistency}
                    <span className="text-foreground font-mono font-bold ml-1">
                      편차 ±{Math.round(analysis.stdDev)}초
                    </span>
                  </span>
                </div>

                {/* Negative/Positive split */}
                {paces.length >= 4 && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${analysis.isNegative ? "bg-accent" : "bg-orange-400"}`} />
                    <span className="text-[11px] text-muted">
                      {analysis.isNegative ? "네거티브 스플릿" : "포지티브 스플릿"}
                      <span className="text-foreground/70 font-mono ml-1">
                        전반 {fmtPace(analysis.firstAvg)} → 후반 {fmtPace(analysis.secondAvg)}
                      </span>
                    </span>
                  </div>
                )}

                {/* Fastest/Slowest info */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">
                    최고 <span className="text-accent font-mono font-bold">{fastestIdx + 1}km</span>
                    {splits.length > 2 && (
                      <> · 최저 <span className="text-orange-400 font-mono font-bold">{slowestIdx + 1}km</span></>
                    )}
                    <span className="text-foreground/70 font-mono ml-1">
                      (차이 {fmtPace(maxPace - minPace)})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Heart rate fallback — shown when stream data is unavailable but summary data exists */
function HrFallbackContent({ record, splits }: { record: DetailedRecord; splits: Split[] }) {
  const avg = record.avg_heart_rate;
  const max = record.max_heart_rate;
  const effortPct = avg && max ? Math.round((avg / max) * 100) : null;

  const splitsWithHr = splits.filter((s) => s.avg_heartrate != null && s.moving_time);
  const totalTime = splitsWithHr.reduce((sum, s) => sum + (s.moving_time ?? s.elapsed_time), 0);

  const zones = useMemo(() => {
    if (splitsWithHr.length === 0 || !max) return null;
    const buckets = [0, 0, 0, 0, 0];
    for (const s of splitsWithHr) {
      const hr = s.avg_heartrate!;
      const pct = hr / max;
      const time = s.moving_time ?? s.elapsed_time;
      if (pct < 0.6) buckets[0] += time;
      else if (pct < 0.7) buckets[1] += time;
      else if (pct < 0.8) buckets[2] += time;
      else if (pct < 0.9) buckets[3] += time;
      else buckets[4] += time;
    }
    return buckets;
  }, [splitsWithHr, max]);

  const zoneLabels = ["회복", "지구력", "템포", "역치", "최대"];
  const zoneColors = ["#94a3b8", "#38bdf8", "var(--accent-solid)", "#f97316", "#ef4444"];

  return (
    <div>
      <div className="flex items-end gap-8 mb-5">
        {avg != null && (
          <div>
            <p className="text-2xl font-black font-mono text-foreground number-reveal" style={{ animationDelay: "200ms" }}>
              {avg}
            </p>
            <p className="text-[11px] text-muted">평균 bpm</p>
          </div>
        )}
        {max != null && (
          <div>
            <p className="text-2xl font-black font-mono text-red-400 number-reveal" style={{ animationDelay: "250ms" }}>
              {max}
            </p>
            <p className="text-[11px] text-muted">최고 bpm</p>
          </div>
        )}
        {effortPct != null && (
          <div className="ml-auto text-right">
            <p className="text-lg font-bold font-mono text-muted">
              {effortPct}%
            </p>
            <p className="text-[11px] text-muted">노력도</p>
          </div>
        )}
      </div>

      {effortPct != null && (
        <div className="mb-5">
          <div className="h-3 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full progress-fill"
              style={{
                width: `${effortPct}%`,
                background: effortPct > 90 ? "#ef4444" : effortPct > 80 ? "#f97316" : effortPct > 70 ? "var(--accent-solid)" : "#38bdf8",
                animationDelay: "200ms",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted">쉬움</span>
            <span className="text-[10px] text-muted">보통</span>
            <span className="text-[10px] text-muted">강함</span>
          </div>
        </div>
      )}

      {zones && totalTime > 0 && (
        <div>
          <p className="text-[11px] text-muted mb-2">심박 존 분포</p>
          <div className="h-6 rounded-lg overflow-hidden flex">
            {zones.map((time, i) => {
              const pct = (time / totalTime) * 100;
              if (pct < 1) return null;
              return (
                <div
                  key={i}
                  className="h-full first:rounded-l-lg last:rounded-r-lg transition-all"
                  style={{ width: `${pct}%`, background: zoneColors[i], opacity: 0.7 }}
                  title={`${zoneLabels[i]}: ${fmtSeconds(time)} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>
          <div className="flex gap-3 mt-2 flex-wrap">
            {zones.map((time, i) => {
              const pct = (time / totalTime) * 100;
              if (pct < 1) return null;
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: zoneColors[i] }} />
                  <span className="text-[10px] text-muted">
                    {zoneLabels[i]} {Math.round(pct)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Elevation fallback — shown when stream altitude data is unavailable but split elevation_diff exists */
function ElevationFallbackContent({ splits, totalGain }: { splits: Split[]; totalGain: number | null }) {
  const profile = useMemo(() => {
    const cumulative = [0];
    for (const s of splits) {
      cumulative.push(cumulative[cumulative.length - 1] + (s.elevation_diff ?? 0));
    }
    return cumulative;
  }, [splits]);

  const minElev = Math.min(...profile);
  const maxElev = Math.max(...profile);
  const range = maxElev - minElev || 1;

  const W = 400;
  const H = 160;
  const PAD = 4;

  const points = profile.map((v, i) => {
    const x = (i / (profile.length - 1)) * (W - PAD * 2) + PAD;
    const y = H - PAD - ((v - minElev) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const areaPath = `M${PAD},${H - PAD} L${points.join(" L")} L${W - PAD},${H - PAD} Z`;
  const linePath = `M${points.join(" L")}`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-solid)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-solid)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#elevGrad)" />
        <path d={linePath} fill="none" stroke="var(--accent-solid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-mono text-muted">0 km</span>
        <span className="text-[10px] font-mono text-muted">{splits.length} km</span>
      </div>
    </div>
  );
}

function RouteSection({ polyline, latlng }: { polyline: string | null; latlng: number[][] | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);

  const points = useMemo(() => {
    if (latlng && latlng.length >= 2) return latlng as [number, number][];
    if (polyline) {
      const decoded = decodePolyline(polyline);
      if (decoded.length >= 2) return decoded;
    }
    return [];
  }, [polyline, latlng]);

  const initMap = useCallback(() => {
    if (!mapRef.current || points.length < 2) return;

    try {
      const { maps } = window.kakao;
      const center = new maps.LatLng(points[0][0], points[0][1]);
      const map = new maps.Map(mapRef.current, { center, level: 5, scrollwheel: false, disableDoubleClickZoom: true });

      // Zoom control
      map.addControl(new maps.ZoomControl(), maps.ControlPosition.BOTTOMRIGHT);

      // Build path + bounds
      const path: InstanceType<typeof maps.LatLng>[] = [];
      const bounds = new maps.LatLngBounds();
      for (const [lat, lng] of points) {
        const pos = new maps.LatLng(lat, lng);
        path.push(pos);
        bounds.extend(pos);
      }

      // Polyline
      new maps.Polyline({
        map,
        path,
        strokeWeight: 5,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.9,
        strokeStyle: "solid",
      });

      // Start marker
      new maps.CustomOverlay({
        map,
        position: path[0],
        content: '<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
        yAnchor: 0.5,
        xAnchor: 0.5,
      });

      // End marker
      new maps.CustomOverlay({
        map,
        position: path[path.length - 1],
        content: '<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
        yAnchor: 0.5,
        xAnchor: 0.5,
      });

      // Fit bounds with padding
      map.setBounds(bounds, 60);
    } catch (e) {
      console.error("[KakaoMap] initMap error:", e);
      setMapError(true);
    }
  }, [points]);

  useEffect(() => {
    if (points.length < 2) return;

    const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!KAKAO_KEY) { console.error("[KakaoMap] NEXT_PUBLIC_KAKAO_MAP_KEY not set"); setMapError(true); return; }

    // Already loaded
    if (window.kakao?.maps) {
      window.kakao.maps.load(initMap);
      return;
    }

    // Check for existing script tag
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="dapi.kakao.com/v2/maps/sdk.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => window.kakao.maps.load(initMap));
      return;
    }

    // Dynamic script injection
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(initMap);
    script.onerror = (e) => { console.error("[KakaoMap] Script load error:", e); setMapError(true); };
    document.head.appendChild(script);
  }, [points, initMap]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-4 card-reveal overflow-hidden" style={{ animationDelay: "250ms" }}>
      <h2 className="text-sm font-bold text-foreground mb-4">경로</h2>

      {points.length < 2 ? (
        <EmptyState message="GPS 데이터 없음" />
      ) : (
        <>
          {mapError ? (
            <RouteFallbackSvg points={points} />
          ) : (
            <div
              ref={mapRef}
              className="rounded-xl overflow-hidden h-[320px] md:h-[480px] w-full"
            />
          )}

          <div className="flex items-center gap-4 mt-3 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
              <span className="text-[10px] text-muted">출발</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="text-[10px] text-muted">도착</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/** SVG fallback when Kakao Maps SDK fails to load */
function RouteFallbackSvg({ points }: { points: [number, number][] }) {
  const { path, viewBox, startCoord, endCoord } = useMemo(() => {
    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const W = 400, H = 300, PAD = 0.12;
    const coords = points.map(([lat, lng]) => {
      const x = ((lng - minLng) / lngRange) * (W * (1 - 2 * PAD)) + W * PAD;
      const y = H - (((lat - minLat) / latRange) * (H * (1 - 2 * PAD)) + H * PAD);
      return [x, y] as [number, number];
    });
    const svgPath = `M${coords.map((c) => c.join(",")).join("L")}`;
    return { path: svgPath, viewBox: `0 0 ${W} ${H}`, startCoord: coords[0], endCoord: coords[coords.length - 1] };
  }, [points]);

  return (
    <div className="rounded-xl bg-surface/50 p-3 border border-border/30">
      <svg viewBox={viewBox} className="w-full h-auto" style={{ maxHeight: 240 }}>
        <defs>
          <pattern id="routeGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-color)" strokeWidth="0.3" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#routeGrid)" />
        <path d={path} fill="none" stroke="var(--accent-solid)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
        <path d={path} fill="none" stroke="var(--accent-solid)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={startCoord[0]} cy={startCoord[1]} r="5" fill="var(--accent-solid)" />
        <circle cx={startCoord[0]} cy={startCoord[1]} r="2" fill="var(--bg)" />
        <circle cx={endCoord[0]} cy={endCoord[1]} r="5" fill="#ef4444" />
        <circle cx={endCoord[0]} cy={endCoord[1]} r="2" fill="var(--bg)" />
      </svg>
    </div>
  );
}

// ─── Stream-based Charts ────────────────────────

function HeartRateChart({ streams, record, splits }: { streams: StreamData | null; record: DetailedRecord; splits: Split[] }) {
  const distKm = streams?.distance?.map((d) => d / 1000);
  const hasStream = !!(streams?.heartrate && distKm);
  const hasFallback = !hasStream && (record.avg_heart_rate != null || record.max_heart_rate != null);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 card-reveal" style={{ animationDelay: "120ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">심박</h2>
        {(hasStream || hasFallback) && (
          <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
            {record.avg_heart_rate != null && <span>평균 <span className="text-foreground font-bold">{record.avg_heart_rate}</span> bpm</span>}
            {record.max_heart_rate != null && <span>최고 <span className="text-red-400 font-bold">{record.max_heart_rate}</span></span>}
          </div>
        )}
      </div>
      {hasStream ? (
        <StreamGraph
          xData={distKm!}
          yData={smoothData(streams!.heartrate!, 10)}
          color="#ef4444"
          gradientId="hrGrad"
          height={180}
          yUnit="bpm"
          xUnit="km"
        />
      ) : hasFallback ? (
        <HrFallbackContent record={record} splits={splits} />
      ) : (
        <EmptyState message="심박 데이터 없음" />
      )}
    </section>
  );
}

function PaceChartSection({ streams, record }: { streams: StreamData | null; record: DetailedRecord }) {
  const distKm = streams?.distance?.map((d) => d / 1000);
  const hasStream = !!(streams?.velocity_smooth && distKm);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 card-reveal" style={{ animationDelay: "160ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">페이스</h2>
        {hasStream && (
          <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
            {record.pace_minkm && <span>평균 <span className="text-accent font-bold">{record.pace_minkm}</span>/km</span>}
          </div>
        )}
      </div>
      {hasStream ? (
        <PaceGraph
          xData={distKm!}
          velocityData={streams!.velocity_smooth!}
          height={180}
        />
      ) : (
        <EmptyState message="페이스 데이터 없음" />
      )}
    </section>
  );
}

function AltitudeChart({ streams, record, splits }: { streams: StreamData | null; record: DetailedRecord; splits: Split[] }) {
  const distKm = streams?.distance?.map((d) => d / 1000);
  const hasStream = !!(streams?.altitude && distKm);
  const hasFallback = !hasStream && splits.some((s) => s.elevation_diff != null);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 card-reveal" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">고도</h2>
        {(hasStream || hasFallback) && record.elevation_gain != null && (
          <span className="text-xs font-mono text-emerald-400">+{Math.round(record.elevation_gain)}m 상승</span>
        )}
      </div>
      {hasStream ? (
        <StreamGraph
          xData={distKm!}
          yData={streams!.altitude!}
          color="var(--accent-solid)"
          gradientId="altGrad"
          height={160}
          yUnit="m"
          xUnit="km"
          type="area"
        />
      ) : hasFallback ? (
        <ElevationFallbackContent splits={splits} totalGain={record.elevation_gain} />
      ) : (
        <EmptyState message="고도 데이터 없음" />
      )}
    </section>
  );
}

/** Generic SVG line/area chart — with gridlines + axis labels */
function StreamGraph({
  xData,
  yData,
  color,
  gradientId,
  height,
  yUnit,
  xUnit,
  type = "line",
}: {
  xData: number[];
  yData: number[];
  color: string;
  gradientId: string;
  height: number;
  yUnit: string;
  xUnit: string;
  type?: "line" | "area";
}) {
  const W = 800;
  const H = height;
  const PAD_Y = 8;

  const computed = useMemo(() => {
    if (xData.length === 0 || yData.length === 0) return null;

    const validY = yData.filter((v) => v != null && isFinite(v));
    const minYVal = Math.min(...validY);
    const maxYVal = Math.max(...validY);
    const rangeY = maxYVal - minYVal || 1;
    const avgYVal = validY.reduce((a, b) => a + b, 0) / validY.length;
    const maxXVal = xData[xData.length - 1] || 1;

    const yStep = niceStep(rangeY, 3);
    const yTickStart = Math.ceil(minYVal / yStep) * yStep;
    const yTicks: { value: number; svgY: number; pct: number }[] = [];
    for (let v = yTickStart; v <= maxYVal + yStep * 0.01; v += yStep) {
      const svgY = H - PAD_Y - ((v - minYVal) / rangeY) * (H - PAD_Y * 2);
      if (svgY >= 0 && svgY <= H) yTicks.push({ value: Math.round(v), svgY, pct: (svgY / H) * 100 });
    }

    const xStep = niceStep(maxXVal, 5);
    const xTicks: { value: number; pct: number; svgX: number }[] = [];
    for (let v = xStep; v < maxXVal - xStep * 0.1; v += xStep) {
      xTicks.push({ value: Math.round(v * 10) / 10, pct: (v / maxXVal) * 100, svgX: (v / maxXVal) * W });
    }

    const pts = xData.map((x, i) => {
      const px = (x / maxXVal) * W;
      const py = H - PAD_Y - ((yData[i] - minYVal) / rangeY) * (H - PAD_Y * 2);
      return `${px},${py}`;
    });

    return {
      linePath: `M${pts.join("L")}`,
      areaPath: `M0,${H - PAD_Y} L${pts.join("L")} L${W},${H - PAD_Y} Z`,
      minY: minYVal, maxY: maxYVal, avgY: avgYVal, maxX: maxXVal, yTicks, xTicks,
    };
  }, [xData, yData, H, PAD_Y, W]);

  if (!computed) return null;
  const { linePath, areaPath, minY, maxY, avgY, maxX, yTicks, xTicks } = computed;

  return (
    <div>
      <div className="flex gap-1.5">
        {/* Y-axis */}
        <div className="w-8 shrink-0 relative" style={{ height }}>
          {yTicks.map((t, i) => (
            <span key={i} className="absolute right-0 text-[10px] font-mono text-muted leading-none -translate-y-1/2" style={{ top: `${t.pct}%` }}>{t.value}</span>
          ))}
        </div>
        {/* Chart */}
        <div className="flex-1 min-w-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {yTicks.map((t, i) => (
              <line key={`y${i}`} x1="0" y1={t.svgY} x2={W} y2={t.svgY} stroke="var(--border-color)" strokeWidth="1" opacity="0.35" vectorEffect="non-scaling-stroke" />
            ))}
            {xTicks.map((t, i) => (
              <line key={`x${i}`} x1={t.svgX} y1={0} x2={t.svgX} y2={H} stroke="var(--border-color)" strokeWidth="1" opacity="0.2" vectorEffect="non-scaling-stroke" strokeDasharray="3,3" />
            ))}
            {type === "area" && <path d={areaPath} fill={`url(#${gradientId})`} />}
            {type === "line" && <path d={areaPath} fill={`url(#${gradientId})`} opacity="0.5" />}
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>
      {/* X-axis */}
      <div className="flex gap-1.5">
        <div className="w-8 shrink-0" />
        <div className="flex-1 relative h-4 mt-0.5">
          <span className="absolute left-0 text-[10px] font-mono text-muted">0</span>
          {xTicks.map((t, i) => (
            <span key={i} className="absolute text-[10px] font-mono text-muted -translate-x-1/2" style={{ left: `${t.pct}%` }}>{t.value}</span>
          ))}
          <span className="absolute right-0 text-[10px] font-mono text-muted">{maxX.toFixed(1)} {xUnit}</span>
        </div>
      </div>
      {/* Summary */}
      <div className="flex gap-1.5">
        <div className="w-8 shrink-0" />
        <div className="flex-1 flex justify-center gap-3 mt-0.5">
          <span className="text-[10px] font-mono text-muted">min <span className="text-foreground">{Math.round(minY)}</span> {yUnit}</span>
          <span className="text-[10px] font-mono text-muted">avg <span className="text-foreground">{Math.round(avgY)}</span></span>
          <span className="text-[10px] font-mono text-muted">max <span className="text-foreground">{Math.round(maxY)}</span></span>
        </div>
      </div>
    </div>
  );
}

/** Pace graph — velocity → min/km, inverted (faster = top), with gridlines */
function PaceGraph({
  xData,
  velocityData,
  height,
}: {
  xData: number[];
  velocityData: number[];
  height: number;
}) {
  const W = 800;
  const H = height;
  const PAD_Y = 8;

  const computed = useMemo(() => {
    if (xData.length === 0) return null;

    // 먼저 velocity를 스무딩한 후 pace로 변환 (순서 중요: 스무딩→변환이 변환→스무딩보다 안정적)
    const smoothed = smoothData(velocityData, 25);
    const paces = smoothed.map((v) => (v > 0.5 ? 1000 / v : null));
    const validPaces = paces.filter((p): p is number => p != null && p < 1200);
    if (validPaces.length === 0) return null;

    // 10~90 백분위수 클리핑 — 걷기/정지 이상치로 인한 Y축 과도 확장 방지
    const sortedPaces = [...validPaces].sort((a, b) => a - b);
    const p5 = sortedPaces[Math.floor(sortedPaces.length * 0.10)];
    const p95 = sortedPaces[Math.floor(sortedPaces.length * 0.90)];
    const minP = p5;
    const maxP = p95;
    const rangeP = Math.max(maxP - minP, 30); // 최소 범위 30초 보장
    const avgP = validPaces.reduce((a, b) => a + b, 0) / validPaces.length;
    const maxXVal = xData[xData.length - 1] || 1;

    // Y ticks for pace (use 15s/30s/60s intervals)
    const paceRange = maxP - minP;
    const paceStep = paceRange <= 60 ? 15 : paceRange <= 180 ? 30 : 60;
    const yTickStart = Math.ceil(minP / paceStep) * paceStep;
    const yTicks: { value: number; svgY: number; pct: number; label: string }[] = [];
    for (let v = yTickStart; v <= maxP + paceStep * 0.01; v += paceStep) {
      const svgY = PAD_Y + ((v - minP) / rangeP) * (H - PAD_Y * 2);
      if (svgY >= 0 && svgY <= H) yTicks.push({ value: v, svgY, pct: (svgY / H) * 100, label: fmtPace(v) });
    }

    // X ticks
    const xStep = niceStep(maxXVal, 5);
    const xTicks: { value: number; pct: number; svgX: number }[] = [];
    for (let v = xStep; v < maxXVal - xStep * 0.1; v += xStep) {
      xTicks.push({ value: Math.round(v * 10) / 10, pct: (v / maxXVal) * 100, svgX: (v / maxXVal) * W });
    }

    const pts = xData.map((x, i) => {
      const pace = paces[i];
      const px = (x / maxXVal) * W;
      // 범위 밖 값은 경계에 클램핑 (데이터 손실 없이 Y축 범위만 제한)
      const clampedPace = pace != null ? Math.max(minP, Math.min(maxP, pace)) : null;
      const py = clampedPace != null ? PAD_Y + ((clampedPace - minP) / rangeP) * (H - PAD_Y * 2) : H / 2;
      return `${px},${py}`;
    });

    return {
      linePath: `M${pts.join("L")}`,
      areaPath: `M0,${H - PAD_Y} L${pts.join("L")} L${W},${H - PAD_Y} Z`,
      minPace: minP, maxPace: maxP, avgPace: avgP, maxX: maxXVal, yTicks, xTicks,
    };
  }, [xData, velocityData, H, PAD_Y, W]);

  if (!computed) return null;
  const { linePath, areaPath, minPace, maxPace, avgPace, maxX, yTicks, xTicks } = computed;

  return (
    <div>
      <div className="flex gap-1.5">
        {/* Y-axis (pace labels) */}
        <div className="w-10 shrink-0 relative" style={{ height }}>
          {yTicks.map((t, i) => (
            <span key={i} className="absolute right-0 text-[10px] font-mono text-muted leading-none -translate-y-1/2" style={{ top: `${t.pct}%` }}>{t.label}</span>
          ))}
        </div>
        {/* Chart */}
        <div className="flex-1 min-w-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="paceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-solid)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--accent-solid)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {yTicks.map((t, i) => (
              <line key={`y${i}`} x1="0" y1={t.svgY} x2={W} y2={t.svgY} stroke="var(--border-color)" strokeWidth="1" opacity="0.35" vectorEffect="non-scaling-stroke" />
            ))}
            {xTicks.map((t, i) => (
              <line key={`x${i}`} x1={t.svgX} y1={0} x2={t.svgX} y2={H} stroke="var(--border-color)" strokeWidth="1" opacity="0.2" vectorEffect="non-scaling-stroke" strokeDasharray="3,3" />
            ))}
            <path d={areaPath} fill="url(#paceGrad)" opacity="0.5" />
            <path d={linePath} fill="none" stroke="var(--accent-solid)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>
      {/* X-axis */}
      <div className="flex gap-1.5">
        <div className="w-10 shrink-0" />
        <div className="flex-1 relative h-4 mt-0.5">
          <span className="absolute left-0 text-[10px] font-mono text-muted">0</span>
          {xTicks.map((t, i) => (
            <span key={i} className="absolute text-[10px] font-mono text-muted -translate-x-1/2" style={{ left: `${t.pct}%` }}>{t.value}</span>
          ))}
          <span className="absolute right-0 text-[10px] font-mono text-muted">{maxX.toFixed(1)} km</span>
        </div>
      </div>
      {/* Summary */}
      <div className="flex gap-1.5">
        <div className="w-10 shrink-0" />
        <div className="flex-1 flex justify-center gap-3 mt-0.5">
          <span className="text-[10px] font-mono text-accent">최고 {fmtPace(minPace)}/km</span>
          <span className="text-[10px] font-mono text-muted">평균 {fmtPace(avgPace)}</span>
          <span className="text-[10px] font-mono text-muted">최저 {fmtPace(maxPace)}</span>
        </div>
      </div>
    </div>
  );
}

function MetaSection({ record, shoe }: { record: DetailedRecord; shoe: { name: string; brand: string | null } | null | undefined }) {
  const movingSec = durToSeconds(record.duration);
  const elapsedSec = durToSeconds(record.elapsed_time);
  const stoppedSec = movingSec != null && elapsedSec != null ? elapsedSec - movingSec : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 card-reveal" style={{ animationDelay: "300ms" }}>
      <h2 className="text-sm font-bold text-foreground mb-4">상세 정보</h2>

      <div className="space-y-3">
        <MetaRow label="운동 유형">
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${getTypeStyle(record.exercise_type).badge}`}>
            {record.exercise_type}
          </span>
        </MetaRow>

        {shoe && (
          <MetaRow label="신발">
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
              <Footprints className="h-3.5 w-3.5 text-muted" />
              {shoe.brand ? `${shoe.brand} ` : ""}{shoe.name}
            </span>
          </MetaRow>
        )}

        {record.tags && record.tags.length > 0 && (
          <MetaRow label="태그">
            <div className="flex flex-wrap gap-1">
              {record.tags.map((tag) => (
                <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getTagStyle(tag)}`}>
                  {tag}
                </span>
              ))}
            </div>
          </MetaRow>
        )}

        {elapsedSec != null && stoppedSec != null && stoppedSec > 0 && (
          <MetaRow label="경과 시간">
            <span className="text-sm font-mono text-foreground">
              {fmtSeconds(elapsedSec)}
              <span className="text-muted ml-2 text-[11px]">
                (정지 {fmtSeconds(stoppedSec)})
              </span>
            </span>
          </MetaRow>
        )}

        {record.source !== "manual" && (
          <MetaRow label="출처">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <StravaIcon size={13} style={{ color: "#FC4C02" }} />
              <span className="text-[#FC4C02] font-medium">Strava</span>
            </span>
          </MetaRow>
        )}
      </div>
    </section>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

// ─── Loading & Not Found ────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="skeleton h-5 w-20 mb-6" />
      <div className="skeleton h-[280px] rounded-2xl mb-4" />
      <div className="skeleton h-[200px] rounded-2xl mb-4" />
      <div className="skeleton h-[120px] rounded-2xl" />
    </div>
  );
}

function NotFoundView({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-lg text-muted">기록을 찾을 수 없습니다</p>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-background text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <ArrowLeft className="h-4 w-4" />
        기록 목록으로
      </button>
    </div>
  );
}
