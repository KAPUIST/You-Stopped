"use client";

import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from "react";
import { useDashboard, RunningRecord, Shoe } from "../context";
import { ArrowUp, ArrowDown, Plus, Pencil, Trash2, X, Loader2, Search, BarChart3, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { parsePaceToSeconds, formatPace, formatPaceColon, kmhToMinKm, paceToKmh } from "../utils";
import { EXERCISE_TYPES, TAG_OPTIONS, getTypeStyle, getTagStyle } from "../constants";

type SortKey = "date" | "exercise_type" | "distance_km" | "duration" | "pace" | "cadence" | "avg_heart_rate";
type SortDir = "asc" | "desc";

// ─── Formatters ──────────────────────────────────
function formatDuration(duration: string | null): string {
  if (!duration) return "-";
  const parts = duration.split(":");
  if (parts.length === 3) {
    const h = parseInt(parts[0]);
    const m = parts[1].padStart(2, "0");
    const s = parts[2].split(".")[0].padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }
  return duration;
}


const SORT_LABELS: Record<SortKey, string> = {
  date: "날짜",
  exercise_type: "유형",
  distance_km: "거리",
  duration: "시간",
  pace: "페이스",
  cadence: "케이던스",
  avg_heart_rate: "심박",
};

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

export default function RecordsPage() {
  const { records, shoes, loading } = useDashboard();

  const years = useMemo(() => {
    const s = new Set<number>();
    for (const r of records) s.add(parseInt(r.date.substring(0, 4)));
    return Array.from(s).sort((a, b) => b - a);
  }, [records]);

  const [selectedYear, setSelectedYear] = useState<number>(() => years[0] ?? new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [sorts, setSorts] = useState<{ key: SortKey; dir: SortDir }[]>([
    { key: "date", dir: "desc" },
  ]);
  const [showDupsOnly, setShowDupsOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showComparison, setShowComparison] = useState(false);

  // ─── Inline notes editing ──────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [notesOverrides, setNotesOverrides] = useState<Map<string, string>>(new Map());
  const [savingId, setSavingId] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  // ─── CRUD state ────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRecord, setModalRecord] = useState<RunningRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  // ─── Ctrl+F / Cmd+F → custom search ────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && searchQuery) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchQuery]);

  const getDisplayNotes = useCallback(
    (r: RunningRecord) => notesOverrides.has(r.id) ? notesOverrides.get(r.id)! : (r.notes ?? ""),
    [notesOverrides],
  );

  const startEdit = useCallback((r: RunningRecord) => {
    cancelledRef.current = false;
    setEditingId(r.id);
    setEditValue(getDisplayNotes(r));
  }, [getDisplayNotes]);

  const cancelEdit = useCallback(() => {
    cancelledRef.current = true;
    setEditingId(null);
    setEditValue("");
  }, []);

  const saveNotes = useCallback(async (id: string, value: string) => {
    if (cancelledRef.current) return;
    const trimmed = value.trim();
    setEditingId(null);
    setSavingId(id);

    // Optimistic update
    const prev = notesOverrides.get(id);
    setNotesOverrides((m) => new Map(m).set(id, trimmed));

    const { error } = await supabase
      .from("running_records")
      .update({ notes: trimmed || null })
      .eq("id", id);

    if (error) {
      // Rollback on failure
      setNotesOverrides((m) => {
        const next = new Map(m);
        if (prev !== undefined) next.set(id, prev);
        else next.delete(id);
        return next;
      });
    }
    setSavingId(null);
  }, [notesOverrides]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    await supabase.from("running_records").delete().eq("id", id);
    window.location.reload();
  }, []);

  const toggleSort = (key: SortKey) => {
    setSorts((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx >= 0) {
        // Already exists: toggle direction, or remove if clicking third time
        const updated = [...prev];
        if (updated[idx].dir === "desc") {
          updated[idx] = { key, dir: "asc" };
        } else {
          // Remove this sort
          updated.splice(idx, 1);
          if (updated.length === 0) return [{ key: "date", dir: "desc" }];
        }
        return updated;
      }
      // Add new sort key
      return [...prev, { key, dir: "desc" }];
    });
  };

  const resetSorts = () => setSorts([{ key: "date", dir: "desc" }]);

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };
  const clearMonths = () => setSelectedMonths(new Set());
  const isAllSelected = selectedMonths.size === 0;

  const monthCounts = useMemo(() => {
    const counts = new Array(12).fill(0);
    for (const r of records) {
      if (parseInt(r.date.substring(0, 4)) === selectedYear) {
        counts[parseInt(r.date.substring(5, 7)) - 1]++;
      }
    }
    return counts;
  }, [records, selectedYear]);
  const maxMonthCount = Math.max(...monthCounts, 1);

  // Detect duplicates across ALL records (date + type + distance)
  const dupIds = useMemo(() => {
    const keyMap = new Map<string, string[]>();
    for (const r of records) {
      const key = `${r.date}|${r.exercise_type}|${r.distance_km}`;
      const ids = keyMap.get(key) ?? [];
      ids.push(r.id);
      keyMap.set(key, ids);
    }
    const ids = new Set<string>();
    for (const group of keyMap.values()) {
      if (group.length > 1) group.forEach((id) => ids.add(id));
    }
    return ids;
  }, [records]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      const y = parseInt(r.date.substring(0, 4));
      if (y !== selectedYear) return false;
      if (selectedMonths.size > 0) {
        const m = parseInt(r.date.substring(5, 7));
        if (!selectedMonths.has(m)) return false;
      }
      if (showDupsOnly && !dupIds.has(r.id)) return false;
      if (typeFilter && r.exercise_type !== typeFilter) return false;
      if (tagFilter && !(r.tags ?? []).includes(tagFilter)) return false;
      if (q) {
        const haystack = [
          r.date,
          r.exercise_type,
          r.distance_km?.toString() ?? "",
          r.pace_minkm ?? "",
          r.pace_kmh?.toString() ?? "",
          r.duration ?? "",
          r.cadence?.toString() ?? "",
          r.avg_heart_rate?.toString() ?? "",
          r.notes ?? "",
          ...(r.tags ?? []),
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, selectedYear, selectedMonths, showDupsOnly, dupIds, typeFilter, tagFilter, searchQuery]);

  const sorted = useMemo(() => {
    const getPaceSeconds = (r: RunningRecord): number => {
      const sec = parsePaceToSeconds(r.pace_minkm);
      if (sec && sec > 60) return sec;
      if (r.pace_kmh) return 3600 / r.pace_kmh;
      return Infinity;
    };

    const cmpByKey = (a: RunningRecord, b: RunningRecord, key: SortKey): number => {
      switch (key) {
        case "date": return a.date.localeCompare(b.date);
        case "exercise_type": return a.exercise_type.localeCompare(b.exercise_type);
        case "distance_km": return (a.distance_km ?? 0) - (b.distance_km ?? 0);
        case "duration": return (a.duration ?? "").localeCompare(b.duration ?? "");
        case "pace": return getPaceSeconds(a) - getPaceSeconds(b);
        case "cadence": return (a.cadence ?? 0) - (b.cadence ?? 0);
        case "avg_heart_rate": return (a.avg_heart_rate ?? 0) - (b.avg_heart_rate ?? 0);
      }
    };

    return [...filtered].sort((a, b) => {
      // Always group by month first
      const monthA = a.date.substring(0, 7);
      const monthB = b.date.substring(0, 7);
      if (monthA !== monthB) return monthB.localeCompare(monthA);

      // Multi-column sort within month
      for (const s of sorts) {
        const cmp = cmpByKey(a, b, s.key);
        if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [filtered, sorts]);

  const totalDist = filtered.reduce((s, r) => s + (r.distance_km ?? 0), 0);
  const paces = filtered
    .map((r) => {
      const sec = parsePaceToSeconds(r.pace_minkm);
      if (sec && sec > 60) return sec;
      if (r.pace_kmh && r.pace_kmh > 0) return 3600 / r.pace_kmh;
      return null;
    })
    .filter((p): p is number => p !== null && p > 60);
  const avgPaceSec = paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : null;
  const avgPaceStr = avgPaceSec
    ? `${Math.floor(avgPaceSec / 60)}'${Math.round(avgPaceSec % 60).toString().padStart(2, "0")}"`
    : "-";
  const avgKmhStr = avgPaceSec ? (3600 / avgPaceSec).toFixed(1) : null;

  // ─── Type Comparison Stats ──────────────────
  const typeComparison = useMemo(() => {
    const groups = new Map<string, RunningRecord[]>();
    for (const r of filtered) {
      const arr = groups.get(r.exercise_type) ?? [];
      arr.push(r);
      groups.set(r.exercise_type, arr);
    }

    return Array.from(groups.entries()).map(([type, recs]) => {
      const count = recs.length;
      const totalDist = recs.reduce((s, r) => s + (r.distance_km ?? 0), 0);
      const avgDist = count > 0 ? totalDist / count : 0;

      // Pace calculations (seconds per km)
      const paceSecs = recs
        .map((r) => {
          const sec = parsePaceToSeconds(r.pace_minkm);
          if (sec && sec > 60) return sec;
          if (r.pace_kmh && r.pace_kmh > 0) return 3600 / r.pace_kmh;
          return null;
        })
        .filter((p): p is number => p !== null && p > 60);

      const avgPace = paceSecs.length > 0
        ? paceSecs.reduce((a, b) => a + b, 0) / paceSecs.length
        : null;
      const bestPace = paceSecs.length > 0 ? Math.min(...paceSecs) : null;

      // Cadence + HR averages
      const cadences = recs.map((r) => r.cadence).filter((c): c is number => c != null);
      const hrs = recs.map((r) => r.avg_heart_rate).filter((h): h is number => h != null);

      return {
        type,
        count,
        totalDist: Math.round(totalDist * 10) / 10,
        avgDist: Math.round(avgDist * 10) / 10,
        avgPaceStr: avgPace ? formatPace(avgPace) : null,
        avgKmh: avgPace ? (3600 / avgPace).toFixed(1) : null,
        bestPaceStr: bestPace ? formatPace(bestPace) : null,
        bestKmh: bestPace ? (3600 / bestPace).toFixed(1) : null,
        avgCadence: cadences.length > 0 ? Math.round(cadences.reduce((a, b) => a + b, 0) / cadences.length) : null,
        avgHr: hrs.length > 0 ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
      };
    }).sort((a, b) => b.count - a.count);
  }, [filtered]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex flex-col md:h-[calc(100vh-48px)] space-y-4">
        <div className="skeleton h-7 w-16" />
        <div className="flex gap-2">
          {[80, 80].map((w, i) => (
            <div key={i} className="skeleton h-10" style={{ width: w }} />
          ))}
        </div>
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-12 shrink-0" />
          ))}
        </div>
        <div className="flex gap-4 md:gap-8">
          {[100, 100, 120].map((w, i) => (
            <div key={i} className="skeleton h-14" style={{ width: w }} />
          ))}
        </div>
        <div className="flex-1 skeleton" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 flex flex-col md:h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl font-bold text-foreground tracking-tight">기록</h1>
        <button
          onClick={() => { setModalRecord(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          기록 추가
        </button>
      </div>

      {/* ─── Year Tabs ─────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-3 md:mb-4">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => { setSelectedYear(y); clearMonths(); }}
            className={`px-4 py-2 rounded-lg text-sm font-mono font-bold transition-all ${
              selectedYear === y
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* ─── Month Chips ───────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-4 md:mb-5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={clearMonths}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
            isAllSelected
              ? "bg-accent/15 text-accent border border-accent/30"
              : "text-muted hover:text-foreground border border-transparent hover:bg-card-hover"
          }`}
        >
          전체
        </button>
        <div className="w-px h-5 bg-border mx-1 shrink-0" />
        {MONTH_LABELS.map((label, i) => {
          const count = monthCounts[i];
          const intensity = count / maxMonthCount;
          const isSelected = selectedMonths.has(i + 1);
          const hasData = count > 0;

          return (
            <button
              key={i}
              onClick={() => hasData ? toggleMonth(i + 1) : undefined}
              className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                !hasData
                  ? "text-muted cursor-default opacity-50"
                  : isSelected
                  ? "text-background font-bold"
                  : "text-muted hover:text-foreground"
              }`}
              style={
                isSelected
                  ? { background: "var(--accent-solid)" }
                  : hasData
                  ? { background: `rgba(var(--accent-rgb), ${0.05 + intensity * 0.12})` }
                  : undefined
              }
              title={hasData ? `${count}회` : undefined}
            >
              {label}
            </button>
          );
        })}
        {dupIds.size > 0 && (
          <>
            <div className="w-px h-5 bg-border mx-1 shrink-0" />
            <button
              onClick={() => setShowDupsOnly((v) => !v)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                showDupsOnly
                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                  : "text-muted hover:text-foreground border border-transparent hover:bg-card-hover"
              }`}
            >
              중복 {dupIds.size}건
            </button>
          </>
        )}
        <div className="w-px h-5 bg-border mx-1 shrink-0" />
        {EXERCISE_TYPES.map((type) => {
          const style = getTypeStyle(type);
          const active = typeFilter === type;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(active ? null : type)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all border shrink-0 ${
                active ? style.badge : "text-muted border-transparent hover:text-foreground"
              }`}
              style={active ? { borderLeftColor: style.border, borderLeftWidth: 2 } : undefined}
            >
              {type}
            </button>
          );
        })}
        {/* 대회 태그 필터 */}
        {records.some((r) => (r.tags ?? []).includes("대회")) && (
          <>
            <div className="w-px h-5 bg-border mx-1 shrink-0" />
            <button
              onClick={() => setTagFilter(tagFilter === "대회" ? null : "대회")}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all border shrink-0 ${
                tagFilter === "대회"
                  ? getTagStyle("대회")
                  : "text-muted border-transparent hover:text-foreground"
              }`}
            >
              대회
            </button>
          </>
        )}
      </div>

      {/* ─── Quick Search ──────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 md:mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색... (Ctrl+F)"
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <span className="text-xs text-muted font-mono shrink-0">
            {filtered.length}건
          </span>
        )}
      </div>

      {/* ─── Summary Strip ─────────────────────────── */}
      <div className="flex items-center gap-4 md:gap-8 mb-4 md:mb-5 px-1 overflow-x-auto scrollbar-hide">
        <div className="shrink-0">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">러닝 횟수</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl md:text-2xl font-bold font-mono text-accent">{filtered.length}</span>
            <span className="text-xs text-muted">회</span>
          </div>
        </div>
        <div className="w-px h-10 bg-border shrink-0" />
        <div className="shrink-0">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">총 거리</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl md:text-2xl font-bold font-mono text-foreground">{Math.round(totalDist * 10) / 10}</span>
            <span className="text-xs text-muted">km</span>
          </div>
        </div>
        <div className="w-px h-10 bg-border shrink-0" />
        <div className="shrink-0">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">평균 페이스</p>
          <div className="flex items-baseline gap-3">
            <span>
              <span className="text-2xl font-bold font-mono text-foreground">{avgPaceStr}</span>
              <span className="text-xs text-muted ml-0.5">/km</span>
            </span>
            {avgKmhStr && (
              <span>
                <span className="text-lg font-bold font-mono text-muted">{avgKmhStr}</span>
                <span className="text-[11px] text-muted ml-0.5">km/h</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Type Comparison Toggle + Cards ─────────── */}
      {typeComparison.length > 1 && (
        <div className="mb-4 md:mb-5">
          <button
            onClick={() => setShowComparison((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground hover:bg-card-hover border border-border/50 transition-all"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            유형별 비교
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showComparison ? "rotate-180" : ""}`} />
          </button>
          {showComparison && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              {typeComparison.map((tc, i) => {
                const style = getTypeStyle(tc.type);
                return (
                  <div
                    key={tc.type}
                    className="rounded-lg border border-border bg-card p-4 card-reveal"
                    style={{ borderLeftColor: style.border, borderLeftWidth: 3, animationDelay: `${i * 40}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${style.badge}`}>
                        {tc.type}
                      </span>
                      <span className="text-xs text-muted font-mono">{tc.count}회</span>
                    </div>

                    {/* Distance */}
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-[10px] text-muted uppercase tracking-wider">거리</span>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-foreground">{tc.totalDist}</span>
                        <span className="text-[11px] text-muted ml-0.5">km</span>
                        <span className="text-[10px] text-muted ml-1.5">(평균 {tc.avgDist})</span>
                      </div>
                    </div>

                    {/* Average Pace */}
                    {tc.avgPaceStr && (
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[10px] text-muted uppercase tracking-wider">평균</span>
                        <div className="text-right font-mono">
                          <span className="text-sm font-bold text-foreground">{tc.avgPaceStr}</span>
                          <span className="text-[11px] text-muted ml-0.5">/km</span>
                          {tc.avgKmh && (
                            <span className="text-[11px] text-muted ml-1.5">{tc.avgKmh} km/h</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Best Pace */}
                    {tc.bestPaceStr && (
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-[10px] text-accent uppercase tracking-wider">최고</span>
                        <div className="text-right font-mono">
                          <span className="text-sm font-bold text-accent">{tc.bestPaceStr}</span>
                          <span className="text-[11px] text-muted ml-0.5">/km</span>
                          {tc.bestKmh && (
                            <span className="text-[11px] text-muted ml-1.5">{tc.bestKmh} km/h</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cadence + HR */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                      {tc.avgCadence && (
                        <span className="text-[11px] font-mono text-muted">
                          {tc.avgCadence} <span className="text-[10px]">spm</span>
                        </span>
                      )}
                      {tc.avgHr && (
                        <span className="text-[11px] font-mono text-muted">
                          {tc.avgHr} <span className="text-[10px]">bpm</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Active Sort Chips ─────────────────────── */}
      {sorts.length > 1 || sorts[0]?.key !== "date" ? (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-[10px] text-muted">정렬:</span>
          {sorts.map((s, i) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent/10 text-accent text-[11px] font-mono"
            >
              {i + 1}. {SORT_LABELS[s.key]} {s.dir === "asc" ? "↑" : "↓"}
            </span>
          ))}
          <button
            onClick={resetSorts}
            className="text-[10px] text-muted hover:text-foreground ml-1"
          >
            초기화
          </button>
        </div>
      ) : null}

      {/* ─── Supabase-style Table ────────────────────── */}
      <div className="md:flex-1 rounded-lg border border-border overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto md:overflow-auto md:flex-1">
          <table className="w-full text-[13px] font-mono border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-card border-b border-border">
                <SortTh label="날짜" sortKey="date" sorts={sorts} onSort={toggleSort} align="left" />
                <SortTh label="유형" sortKey="exercise_type" sorts={sorts} onSort={toggleSort} align="left" />
                <SortTh label="거리" sortKey="distance_km" sorts={sorts} onSort={toggleSort} align="right" />
                <SortTh label="시간" sortKey="duration" sorts={sorts} onSort={toggleSort} align="right" />
                <SortTh label="페이스" sortKey="pace" sorts={sorts} onSort={toggleSort} align="right" />
                <SortTh label="케이던스" sortKey="cadence" sorts={sorts} onSort={toggleSort} align="right" />
                <SortTh label="심박" sortKey="avg_heart_rate" sorts={sorts} onSort={toggleSort} align="right" />
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted whitespace-nowrap">
                  비고
                </th>
                <th className="w-[72px]" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const prevMonth = i > 0 ? sorted[i - 1].date.substring(5, 7) : null;
                const curMonth = r.date.substring(5, 7);
                const showSep = (isAllSelected || selectedMonths.size > 1) && curMonth !== prevMonth;
                const d = new Date(r.date + "T00:00:00");
                const day = d.getDate().toString().padStart(2, "0");
                const weekday = d.toLocaleDateString("ko-KR", { weekday: "short" });

                return (
                  <Fragment key={r.id}>
                    {showSep && (
                      <tr>
                        <td colSpan={9} className="py-0">
                          <div className="flex items-center gap-3 py-4 px-4">
                            <span className="text-sm font-black text-foreground tracking-widest uppercase">
                              {parseInt(curMonth)}월
                            </span>
                            <div className="flex-1 h-[2px] bg-border rounded-full" />
                          </div>
                        </td>
                      </tr>
                    )}
                    {(() => {
                      const ts = getTypeStyle(r.exercise_type);
                      const isDup = dupIds.has(r.id);
                      return (
                        <tr
                          className={`border-b border-border/50 hover:bg-card-hover transition-colors ${isDup ? "bg-red-500/5" : ""}`}
                          style={{ borderLeft: `3px solid ${ts.border}`, background: isDup ? undefined : ts.bg }}
                        >
                          <td className="px-2 md:px-4 py-2 text-foreground whitespace-nowrap border-r border-border/20">
                            {isDup && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5" />}
                            {day}
                            <span className="text-muted ml-1 md:ml-1.5 text-[11px]">{weekday}</span>
                          </td>
                          <td className="px-1.5 md:px-3 py-2 border-r border-border/20">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`inline-block px-1.5 md:px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${ts.badge}`}>
                                {r.exercise_type}
                              </span>
                              {(r.tags ?? []).map((tag) => (
                                <span
                                  key={tag}
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${getTagStyle(tag)}`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 md:px-4 py-2 text-right text-accent font-semibold border-r border-border/20 whitespace-nowrap">
                            {r.distance_km != null ? <>{r.distance_km}<span className="text-muted ml-0.5 md:ml-1 text-[11px] font-normal">km</span></> : <span className="text-muted">-</span>}
                          </td>
                          <td className="px-4 py-2 text-right text-foreground border-r border-border/20 whitespace-nowrap">
                            {r.duration ? formatDuration(r.duration) : <span className="text-muted">-</span>}
                          </td>
                          <td className="px-4 py-1.5 text-right border-r border-border/20 whitespace-nowrap">
                            {r.pace_minkm ? (
                              <div>
                                <span className="text-foreground">{r.pace_minkm}<span className="text-muted ml-1 text-[11px]">/km</span></span>
                                {paceToKmh(r.pace_minkm) && (
                                  <div className="text-[11px] text-muted">{paceToKmh(r.pace_minkm)} km/h</div>
                                )}
                              </div>
                            ) : r.pace_kmh ? (
                              <div>
                                <span className="text-foreground">{r.pace_kmh}<span className="text-muted ml-1 text-[11px]">km/h</span></span>
                                <div className="text-[11px] text-muted">{kmhToMinKm(r.pace_kmh)} /km</div>
                              </div>
                            ) : <span className="text-muted">-</span>}
                          </td>
                          <td className="px-4 py-2 text-right text-foreground border-r border-border/20 whitespace-nowrap">
                            {r.cadence != null ? (
                              <>{r.cadence}<span className="text-muted ml-1 text-[11px]">spm</span></>
                            ) : <span className="text-muted">-</span>}
                          </td>
                          <td className="px-4 py-2 text-right text-foreground border-r border-border/20 whitespace-nowrap">
                            {r.avg_heart_rate != null ? (
                              <>{r.avg_heart_rate}<span className="text-muted ml-1 text-[11px]">bpm</span></>
                            ) : <span className="text-muted">-</span>}
                          </td>
                          <td
                            className={`px-4 py-2 text-[12px] max-w-[200px] ${savingId === r.id ? "opacity-50" : ""}`}
                          >
                            {editingId === r.id ? (
                              <input
                                autoFocus
                                className="w-full bg-transparent border border-accent/40 rounded px-2 py-1 text-foreground text-[12px] outline-none focus:border-accent"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); saveNotes(r.id, editValue); }
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                onBlur={() => saveNotes(r.id, editValue)}
                              />
                            ) : (
                              <span
                                className="block truncate cursor-pointer rounded px-1 -mx-1 hover:bg-card-hover text-muted transition-colors"
                                title={getDisplayNotes(r) || "클릭하여 메모 추가"}
                                onClick={() => startEdit(r)}
                              >
                                {getDisplayNotes(r) || <span className="text-muted/60 italic">메모 추가...</span>}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => { setModalRecord(r); setModalOpen(true); }}
                                className="p-1.5 rounded text-muted hover:text-foreground hover:bg-card-hover transition-colors"
                                title="수정"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {confirmDeleteId === r.id ? (
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  className="px-2 py-1 rounded text-[11px] text-red-400 bg-red-500/15 hover:bg-red-500/25 transition-colors font-medium"
                                >
                                  {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "삭제?"}
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(r.id)}
                                  className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="삭제"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </Fragment>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted text-sm">
                    기록 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <RecordModal
          record={modalRecord}
          shoes={shoes.filter((s) => s.status === "active")}
          onClose={() => { setModalOpen(false); setModalRecord(null); }}
        />
      )}
    </div>
  );
}

function SortTh({
  label,
  sortKey,
  sorts,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sorts: { key: SortKey; dir: SortDir }[];
  onSort: (key: SortKey) => void;
  align: "left" | "right";
}) {
  const idx = sorts.findIndex((s) => s.key === sortKey);
  const active = idx >= 0;
  const dir = active ? sorts[idx].dir : null;
  const order = active && sorts.length > 1 ? idx + 1 : null;

  return (
    <th
      className={`px-4 py-2.5 text-xs font-medium border-r border-border/40 cursor-pointer select-none transition-colors hover:bg-card-hover whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      } ${active ? "text-accent" : "text-muted"}`}
      onClick={() => onSort(sortKey)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {align === "right" && active && (
          dir === "asc"
            ? <ArrowUp className="h-3 w-3" />
            : <ArrowDown className="h-3 w-3" />
        )}
        {label}
        {align === "left" && active && (
          dir === "asc"
            ? <ArrowUp className="h-3 w-3" />
            : <ArrowDown className="h-3 w-3" />
        )}
        {order && (
          <span className="text-[9px] bg-accent/20 rounded px-1 leading-tight">{order}</span>
        )}
      </span>
    </th>
  );
}

// ─── Duration Helpers ────────────────────────
function parseDurationParts(dur: string | null | undefined): { h: string; m: string; s: string } {
  if (!dur) return { h: "", m: "", s: "" };
  const parts = dur.split(":");
  if (parts.length === 3) {
    return {
      h: parseInt(parts[0]).toString(),
      m: parseInt(parts[1]).toString(),
      s: parseInt(parts[2].split(".")[0]).toString(),
    };
  }
  return { h: "", m: "", s: "" };
}

// ─── Time Input Formatters ───────────────────

function fmtPace(digits: string): string {
  if (!digits) return "";
  const ss = digits.length >= 3 ? parseInt(digits.slice(-2)) : 0;
  const mm = digits.length >= 3 ? parseInt(digits.slice(0, -2)) : parseInt(digits);
  let m = mm, s = ss;
  if (s >= 60) { m += Math.floor(s / 60); s = s % 60; }
  return `${m}'${s.toString().padStart(2, "0")}"`;
}

// Extract raw digits from existing DB value
function extractDigits(value: string | null | undefined, max: number): string {
  return (value ?? "").replace(/\D/g, "").slice(0, max);
}

// Shared keyDown handler factory for digit-only inputs
function digitKeyHandler(
  setter: (fn: (prev: string) => string) => void,
  max: number,
) {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      setter((prev) => (prev + e.key).slice(0, max));
    } else if (e.key === "Backspace") {
      e.preventDefault();
      setter((prev) => prev.slice(0, -1));
    }
    // Tab, Escape, Enter etc. pass through naturally
  };
}

function digitPasteHandler(
  setter: (fn: (prev: string) => string) => void,
  max: number,
) {
  return (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, max);
    setter(() => digits);
  };
}

// ─── Record Modal ────────────────────────────
function RecordModal({
  record,
  shoes,
  onClose,
}: {
  record: RunningRecord | null;
  shoes: Shoe[];
  onClose: () => void;
}) {
  const isEdit = record !== null;
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(record?.date ?? new Date().toISOString().slice(0, 10));
  const [exerciseType, setExerciseType] = useState(record?.exercise_type ?? "로드");
  const [distanceKm, setDistanceKm] = useState(record?.distance_km?.toString() ?? "");

  // 시/분/초 분리 입력
  const initDur = useMemo(() => parseDurationParts(record?.duration), [record?.duration]);
  const [durH, setDurH] = useState(initDur.h);
  const [durM, setDurM] = useState(initDur.m);
  const [durS, setDurS] = useState(initDur.s);

  const [paceDigits, setPaceDigits] = useState(() => extractDigits(record?.pace_minkm, 4));
  const paceManualRef = useRef(isEdit && !!record?.pace_minkm);

  const [cadence, setCadence] = useState(record?.cadence?.toString() ?? "");
  const [avgHr, setAvgHr] = useState(record?.avg_heart_rate?.toString() ?? "");
  const [shoeId, setShoeId] = useState(record?.shoe_id ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(record?.tags ?? []);
  const [notes, setNotes] = useState(record?.notes ?? "");

  // Computed: 총 초 + HH:MM:SS 포맷
  const totalDurSec = useMemo(() => {
    const h = parseInt(durH) || 0;
    const m = parseInt(durM) || 0;
    const s = parseInt(durS) || 0;
    return h * 3600 + m * 60 + s;
  }, [durH, durM, durS]);

  const durationDisplay = useMemo(() => {
    if (totalDurSec === 0 && !durH && !durM && !durS) return "";
    const h = Math.floor(totalDurSec / 3600);
    const m = Math.floor((totalDurSec % 3600) / 60);
    const s = totalDurSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [totalDurSec, durH, durM, durS]);

  const paceDisplay = useMemo(() => fmtPace(paceDigits), [paceDigits]);

  // 거리 + 시간 → 페이스 자동 계산
  useEffect(() => {
    if (paceManualRef.current) return;
    const dist = parseFloat(distanceKm);
    if (!dist || dist <= 0 || totalDurSec <= 0) return;
    const paceSecPerKm = totalDurSec / dist;
    const pm = Math.floor(paceSecPerKm / 60);
    const ps = Math.round(paceSecPerKm % 60);
    // paceDigits 형식: "533" → 5'33"
    setPaceDigits(`${pm}${ps.toString().padStart(2, "0")}`);
  }, [distanceKm, totalDurSec]);

  const autoKmh = useMemo(() => {
    if (!paceDisplay) return null;
    const sec = parsePaceToSeconds(paceDisplay);
    if (!sec || sec <= 0) return null;
    return (3600 / sec).toFixed(1);
  }, [paceDisplay]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!date || !exerciseType) return;
    setSaving(true);

    let paceKmh: number | null = null;
    if (paceDisplay) {
      const sec = parsePaceToSeconds(paceDisplay);
      if (sec && sec > 0) paceKmh = Math.round((3600 / sec) * 10) / 10;
    }

    const payload = {
      date,
      exercise_type: exerciseType,
      distance_km: distanceKm ? parseFloat(distanceKm) : null,
      duration: durationDisplay || null,
      pace_minkm: paceDisplay || null,
      pace_kmh: paceKmh,
      cadence: cadence ? parseInt(cadence) : null,
      avg_heart_rate: avgHr ? parseInt(avgHr) : null,
      shoe_id: shoeId || null,
      tags: selectedTags,
      notes: notes.trim() || null,
    };

    if (isEdit) {
      await supabase.from("running_records").update(payload).eq("id", record.id);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from("running_records").insert({ ...payload, user_id: session.user.id });
    }

    window.location.reload();
  }, [date, exerciseType, distanceKm, durationDisplay, paceDisplay, cadence, avgHr, shoeId, selectedTags, notes, isEdit, record]);

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-card shadow-2xl card-reveal max-h-[90vh] flex flex-col"
        style={{ animationDelay: "0ms" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="text-base font-bold text-foreground">{isEdit ? "기록 수정" : "기록 추가"}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-muted hover:text-foreground hover:bg-card-hover transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* 날짜 + 운동유형 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">날짜 *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">운동유형 *</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {EXERCISE_TYPES.map((t) => {
                  const s = getTypeStyle(t);
                  const active = exerciseType === t;
                  return (
                    <button key={t} onClick={() => setExerciseType(t)}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                        active ? s.badge : "text-muted border-border hover:text-foreground"
                      }`}>{t}</button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 거리 + 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">거리</label>
              <div className="relative">
                <input type="number" step="0.01" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="10.0" className={`${inputCls} font-mono pr-10`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">km</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">시간</label>
              <div className="flex items-center gap-1">
                <input type="number" min="0" max="23" value={durH} onChange={(e) => setDurH(e.target.value)}
                  placeholder="0" className={`${inputCls} font-mono text-center !px-1 w-14`} />
                <span className="text-muted text-xs">시</span>
                <input type="number" min="0" max="59" value={durM} onChange={(e) => setDurM(e.target.value)}
                  placeholder="0" className={`${inputCls} font-mono text-center !px-1 w-14`} />
                <span className="text-muted text-xs">분</span>
                <input type="number" min="0" max="59" value={durS} onChange={(e) => setDurS(e.target.value)}
                  placeholder="0" className={`${inputCls} font-mono text-center !px-1 w-14`} />
                <span className="text-muted text-xs">초</span>
              </div>
            </div>
          </div>

          {/* 페이스 + 자동 계산 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">페이스</label>
              <div className="relative">
                <input type="text" value={paceDisplay} readOnly={false} onChange={() => {}}
                  onKeyDown={(e) => {
                    if ((e.key >= "0" && e.key <= "9") || e.key === "Backspace") {
                      paceManualRef.current = true;
                    }
                    digitKeyHandler(setPaceDigits, 4)(e);
                  }}
                  onPaste={(e) => { paceManualRef.current = true; digitPasteHandler(setPaceDigits, 4)(e); }}
                  placeholder={"0'00\""} className={`${inputCls} font-mono pr-10`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">/km</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">속도</label>
              <div className="flex items-center h-[38px] px-3 rounded-lg border border-border/50 bg-surface text-sm font-mono">
                {autoKmh ? (
                  <><span className="text-foreground">{autoKmh}</span><span className="text-muted ml-1 text-xs">km/h</span></>
                ) : (
                  <span className="text-muted text-xs">거리+시간 입력 시 자동</span>
                )}
              </div>
            </div>
          </div>

          {/* 케이던스 + 심박 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">케이던스</label>
              <div className="relative">
                <input type="number" value={cadence} onChange={(e) => setCadence(e.target.value)}
                  placeholder="180" className={`${inputCls} font-mono pr-12`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">spm</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">평균 심박</label>
              <div className="relative">
                <input type="number" value={avgHr} onChange={(e) => setAvgHr(e.target.value)}
                  placeholder="150" className={`${inputCls} font-mono pr-12`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">bpm</span>
              </div>
            </div>
          </div>

          {/* 신발 선택 */}
          {shoes.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">신발</label>
              <select value={shoeId} onChange={(e) => setShoeId(e.target.value)}
                className={`${inputCls} cursor-pointer`}>
                <option value="">선택 안함</option>
                {shoes.map((s) => (
                  <option key={s.id} value={s.id}>{s.brand ? `${s.brand} ` : ""}{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 태그 */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">태그</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button key={tag} onClick={() => {
                    setSelectedTags((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag]);
                  }}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                      active ? getTagStyle(tag) : "text-muted border-border hover:text-foreground"
                    }`}>{tag}</button>
                );
              })}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">메모</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="선택 사항"
              className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-card-hover transition-colors">취소</button>
          <button onClick={handleSave} disabled={!date || !exerciseType || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "저장" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
