"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useDashboard, type Shoe, type ShoeDistanceLog } from "../context";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Footprints,
  AlertTriangle,
  X,
  Pencil,
  Archive,
  RotateCcw,
  Loader2,
  MoreHorizontal,
} from "lucide-react";

import { EXERCISE_TYPES, getTypeStyle } from "../constants";

const TYPE_OPTIONS = [...EXERCISE_TYPES];
type FilterStatus = "all" | "active" | "retired";

function formatCompactDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Skeleton ────────────────────────────────

function ShoesSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="skeleton h-7 w-28" />
        <div className="skeleton h-9 w-24" />
      </div>
      <div className="flex gap-3">
        {[100, 120, 100].map((w, i) => (
          <div key={i} className="skeleton h-16" style={{ width: w }} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[220px]" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────

export default function ShoesPage() {
  const { shoes, records, loading } = useDashboard();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShoe, setEditingShoe] = useState<Shoe | null>(null);
  const [logs, setLogs] = useState<ShoeDistanceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // 로그 데이터 로딩
  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from("shoe_distance_logs")
        .select("*")
        .order("date", { ascending: false });
      if (!error) setLogs(data ?? []);
      setLogsLoading(false);
    }
    if (!loading) fetchLogs();
  }, [loading]);

  // 신발별 로그 맵
  const logsByShoe = useMemo(() => {
    const map = new Map<string, ShoeDistanceLog[]>();
    for (const log of logs) {
      const arr = map.get(log.shoe_id) ?? [];
      arr.push(log);
      map.set(log.shoe_id, arr);
    }
    return map;
  }, [logs]);

  // 신발별 연결된 running_records 누적거리
  const linkedDistMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      if (r.shoe_id && r.distance_km) {
        map.set(r.shoe_id, (map.get(r.shoe_id) ?? 0) + r.distance_km);
      }
    }
    return map;
  }, [records]);

  const filteredShoes = useMemo(() => {
    if (filter === "all") return shoes;
    return shoes.filter((s) => (filter === "active" ? s.status === "active" : s.status === "retired"));
  }, [shoes, filter]);

  // 요약 통계
  const getShoeTotal = (shoe: Shoe) => {
    const logDist = (logsByShoe.get(shoe.id) ?? []).reduce((s, l) => s + l.distance_km, 0);
    const linkedDist = linkedDistMap.get(shoe.id) ?? 0;
    return shoe.initial_distance_km + logDist + linkedDist;
  };

  const activeCount = shoes.filter((s) => s.status === "active").length;
  const totalMileage = shoes.reduce((sum, s) => sum + getShoeTotal(s), 0);
  const warningCount = shoes.filter((s) => {
    if (s.status !== "active") return false;
    return (getShoeTotal(s) / s.max_distance_km) * 100 >= 80;
  }).length;

  const openAdd = () => { setEditingShoe(null); setModalOpen(true); };
  const openEdit = (shoe: Shoe) => { setEditingShoe(shoe); setModalOpen(true); };

  const refreshLogs = async () => {
    const { data } = await supabase
      .from("shoe_distance_logs")
      .select("*")
      .order("date", { ascending: false });
    if (data) setLogs(data);
  };

  if (loading || logsLoading) return <ShoesSkeleton />;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      {/* ═══ Header ═══════════════════════════════ */}
      <div className="card-reveal flex items-center justify-between" style={{ animationDelay: "0ms" }}>
        <h1 className="text-xl font-bold text-foreground tracking-tight">신발 관리</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          신발 추가
        </button>
      </div>

      {/* ═══ Summary Strip ════════════════════════ */}
      <div className="card-reveal flex items-center gap-4 md:gap-8 px-1" style={{ animationDelay: "40ms" }}>
        <div className="shrink-0">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">활성 신발</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl md:text-2xl font-bold font-mono text-accent">{activeCount}</span>
            <span className="text-xs text-muted">켤레</span>
          </div>
        </div>
        <div className="w-px h-10 bg-border shrink-0" />
        <div className="shrink-0">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">총 누적거리</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl md:text-2xl font-bold font-mono text-foreground">{Math.round(totalMileage * 10) / 10}</span>
            <span className="text-xs text-muted">km</span>
          </div>
        </div>
        {warningCount > 0 && (
          <>
            <div className="w-px h-10 bg-border shrink-0" />
            <div className="shrink-0">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">교체 임박</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl md:text-2xl font-bold font-mono text-amber-400">{warningCount}</span>
                <span className="text-xs text-muted">켤레</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ Filter Chips ═════════════════════════ */}
      <div className="card-reveal flex items-center gap-1.5" style={{ animationDelay: "80ms" }}>
        {(["all", "active", "retired"] as FilterStatus[]).map((f) => {
          const label = f === "all" ? "전체" : f === "active" ? "활성" : "은퇴";
          const count = f === "all" ? shoes.length : shoes.filter((s) => s.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "text-muted hover:text-foreground border border-transparent hover:bg-card-hover"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* ═══ Shoe Cards Grid ══════════════════════ */}
      {filteredShoes.length === 0 ? (
        <div className="card-reveal flex flex-col items-center justify-center py-20 text-muted" style={{ animationDelay: "120ms" }}>
          <Footprints className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">등록된 신발이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredShoes.map((shoe, i) => (
            <ShoeCard
              key={shoe.id}
              shoe={shoe}
              logs={logsByShoe.get(shoe.id) ?? []}
              linkedDist={linkedDistMap.get(shoe.id) ?? 0}
              delay={120 + i * 40}
              onEdit={() => openEdit(shoe)}
              onLogsChange={refreshLogs}
            />
          ))}
        </div>
      )}

      {/* ═══ Modal ════════════════════════════════ */}
      {modalOpen && (
        <ShoeModal shoe={editingShoe} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

// ─── Shoe Card ───────────────────────────────

function ShoeCard({
  shoe,
  logs,
  linkedDist,
  delay,
  onEdit,
  onLogsChange,
}: {
  shoe: Shoe;
  logs: ShoeDistanceLog[];
  linkedDist: number;
  delay: number;
  onEdit: () => void;
  onLogsChange: () => void;
}) {
  const [retiring, setRetiring] = useState(false);
  const [addKm, setAddKm] = useState("");
  const [addType, setAddType] = useState("로드");
  const [addDate, setAddDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [addSaving, setAddSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const wellRef = useRef<HTMLDivElement>(null);

  // 태그별 거리 breakdown
  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) {
      map.set(log.exercise_type, (map.get(log.exercise_type) ?? 0) + log.distance_km);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a);
  }, [logs]);

  const logDist = logs.reduce((s, l) => s + l.distance_km, 0);
  const totalDist = shoe.initial_distance_km + logDist + linkedDist;
  const percentage = Math.min((totalDist / shoe.max_distance_km) * 100, 100);
  const isWarning = percentage >= 80;
  const isRetired = shoe.status === "retired";

  const handleStatusToggle = async () => {
    setRetiring(true);
    const newStatus = isRetired ? "active" : "retired";
    await supabase.from("shoes").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", shoe.id);
    window.location.reload();
  };

  const handleAddDistance = async () => {
    const km = parseFloat(addKm);
    if (!km || km <= 0) return;
    setAddSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("shoe_distance_logs").insert({
      shoe_id: shoe.id,
      user_id: session.user.id,
      distance_km: km,
      exercise_type: addType,
      date: addDate,
    });
    setAddKm("");
    setAddDate(new Date().toISOString().split("T")[0]);
    setAddSaving(false);
    onLogsChange();
  };

  const handleDeleteLog = async (logId: string) => {
    setDeletingLogId(logId);
    await supabase.from("shoe_distance_logs").delete().eq("id", logId);
    setDeletingLogId(null);
    onLogsChange();
  };

  const handleWellBlur = useCallback((e: React.FocusEvent) => {
    setTimeout(() => {
      if (!wellRef.current?.contains(document.activeElement)) {
        setInputFocused(false);
      }
    }, 0);
  }, []);

  const recentLogs = logs.slice(0, 3);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className={`group rounded-xl border bg-card p-5 card-reveal relative ${
        isRetired ? "border-border opacity-60" : isWarning ? "border-amber-500/30" : "border-border"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isWarning && !isRetired && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-bold truncate ${isRetired ? "text-muted" : "text-foreground"}`}>
              {shoe.name}
            </h3>
            {isRetired && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-500/15 text-zinc-400 border border-zinc-500/20">
                은퇴
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {shoe.brand && <span className="text-xs text-muted">{shoe.brand}</span>}
            {(shoe.tags ?? [shoe.purpose]).map((tag) => (
              <span key={tag} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${getTypeStyle(tag).badge}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="relative shrink-0 ml-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-1.5 rounded-md text-muted hover:text-foreground hover:bg-card-hover transition-all ${
              menuOpen ? "opacity-100" : "md:opacity-0 md:group-hover:opacity-100"
            }`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] rounded-lg border border-border bg-card shadow-2xl py-1">
                <button
                  onClick={() => { onEdit(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-foreground hover:bg-card-hover transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  수정
                </button>
                <button
                  onClick={() => { handleStatusToggle(); setMenuOpen(false); }}
                  disabled={retiring}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-foreground hover:bg-card-hover transition-colors disabled:opacity-50"
                >
                  {retiring ? <Loader2 className="h-3 w-3 animate-spin" /> : isRetired ? <RotateCcw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                  {isRetired ? "복구" : "은퇴"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Total distance */}
      <div className="mb-2">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold font-mono ${isWarning && !isRetired ? "text-amber-400" : "text-accent"}`}>
            {Math.round(totalDist * 100) / 100}
          </span>
          <span className="text-sm text-muted">/ {shoe.max_distance_km} km</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 bg-border/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full progress-fill transition-colors"
            style={{
              width: `${percentage}%`,
              backgroundColor: isWarning && !isRetired ? "#fbbf24" : getTypeStyle((shoe.tags ?? [shoe.purpose])[0]).bar,
              animationDelay: `${delay + 200}ms`,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] font-mono text-muted">{Math.round(percentage)}%</span>
          {isWarning && !isRetired && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
              <AlertTriangle className="h-3 w-3" />
              교체 임박
            </span>
          )}
          <span className="text-[11px] font-mono text-muted">
            남은: {Math.max(Math.round((shoe.max_distance_km - totalDist) * 10) / 10, 0)}km
          </span>
        </div>
      </div>

      {/* ── Type Breakdown ──────────────────── */}
      {typeBreakdown.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
          {typeBreakdown.map(([type, dist]) => {
            const style = getTypeStyle(type);
            return (
              <span key={type} className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span className="text-muted">{type}</span>
                <span className="text-foreground font-medium">{Math.round(dist * 100) / 100}km</span>
              </span>
            );
          })}
        </div>
      )}

      {/* ── Add Distance (embedded well) ──────── */}
      {!isRetired && (
        <div
          ref={wellRef}
          className="mb-3 rounded-lg bg-background/50 border border-border/30 px-3 py-2.5"
          onFocus={() => setInputFocused(true)}
          onBlur={handleWellBlur}
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={addKm}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || parseFloat(v) >= 0) setAddKm(v);
              }}
              placeholder="거리 입력"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddDistance();
                if (e.key === "Escape") (e.target as HTMLInputElement).blur();
              }}
              className="flex-1 bg-transparent text-sm text-foreground font-mono placeholder:text-muted focus:outline-none min-w-0"
            />
            <span className="text-xs text-muted shrink-0">km</span>
            <button
              onClick={handleAddDistance}
              disabled={!addKm || parseFloat(addKm) <= 0 || addSaving}
              className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-30 ${
                inputFocused
                  ? "bg-accent text-background hover:opacity-90"
                  : "text-accent hover:bg-accent/10"
              }`}
            >
              {addSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "추가"}
            </button>
          </div>
          <div className="mt-1.5">
            {inputFocused ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {TYPE_OPTIONS.map((t) => {
                    const s = getTypeStyle(t);
                    return (
                      <button
                        key={t}
                        onClick={() => setAddType(t)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                          addType === t ? s.badge : "text-muted border-border/50 hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="text-[10px] text-muted bg-transparent border-none focus:outline-none shrink-0 w-[100px]"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-muted">
                <span className={`w-1.5 h-1.5 rounded-full ${getTypeStyle(addType).dot}`} />
                <span>{addType}</span>
                <span>·</span>
                <span>{addDate === today ? "오늘" : formatCompactDate(addDate)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recent Logs ───────────────────────── */}
      {recentLogs.length > 0 && (
        <div className="mb-3 space-y-0.5">
          {recentLogs.map((log) => {
            const style = getTypeStyle(log.exercise_type);
            return (
              <div key={log.id} className="group/log flex items-center gap-2 text-[11px] py-0.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                <span className="text-muted font-mono">{formatCompactDate(log.date)}</span>
                <span className="text-muted">{log.exercise_type}</span>
                <span className="text-foreground font-mono font-medium">{log.distance_km}km</span>
                <button
                  onClick={() => handleDeleteLog(log.id)}
                  disabled={deletingLogId === log.id}
                  className="ml-auto p-0.5 rounded opacity-0 group-hover/log:opacity-100 text-muted hover:text-foreground transition-all disabled:opacity-50"
                >
                  {deletingLogId === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Meta */}
      {shoe.purchased_at && (
        <p className="text-[11px] text-muted">
          구매일: {new Date(shoe.purchased_at + "T00:00:00").toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
        </p>
      )}
    </div>
  );
}

// ─── Add/Edit Modal ──────────────────────────

function ShoeModal({
  shoe,
  onClose,
}: {
  shoe: Shoe | null;
  onClose: () => void;
}) {
  const isEdit = shoe !== null;
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(shoe?.name ?? "");
  const [brand, setBrand] = useState(shoe?.brand ?? "");
  const [tags, setTags] = useState<string[]>(shoe?.tags ?? [shoe?.purpose ?? "로드"]);
  const [purchasedAt, setPurchasedAt] = useState(shoe?.purchased_at ?? "");
  const [maxDist, setMaxDist] = useState(shoe?.max_distance_km?.toString() ?? "800");
  const [notes, setNotes] = useState(shoe?.notes ?? "");

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      brand: brand.trim() || null,
      purpose: tags[0] ?? "로드",
      tags,
      purchased_at: purchasedAt || null,
      max_distance_km: parseFloat(maxDist) || 800,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (isEdit) {
      await supabase.from("shoes").update(payload).eq("id", shoe.id);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from("shoes").insert({ ...payload, user_id: session.user.id });
    }

    window.location.reload();
  }, [name, brand, tags, purchasedAt, maxDist, notes, isEdit, shoe]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-xl border border-border bg-card shadow-2xl card-reveal" style={{ animationDelay: "0ms" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="text-base font-bold text-foreground">{isEdit ? "신발 수정" : "신발 추가"}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-muted hover:text-foreground hover:bg-card-hover transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">이름 *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 페가수스 41"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">브랜드</label>
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="예: Nike"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">용도 (복수 선택)</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map((t) => {
                  const s = getTypeStyle(t);
                  const active = tags.includes(t);
                  return (
                    <button key={t} onClick={() => {
                      setTags((prev) =>
                        active ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]
                      );
                    }}
                      className={`px-2 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                        active ? s.badge : "text-muted border-border hover:text-foreground"
                      }`}>{t}</button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">구매일</label>
              <input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">교체 목표 (km)</label>
              <input type="number" step="1" value={maxDist} onChange={(e) => setMaxDist(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:border-accent/50 transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">메모</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="선택 사항"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-card-hover transition-colors">취소</button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "저장" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
