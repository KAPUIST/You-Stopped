// ─── Pace Utilities ─────────────────────────
// pace_minkm is stored as M'SS" format (e.g. "5'31"")

export function parsePaceToSeconds(pace: string | null): number | null {
  if (!pace || !pace.includes("'")) return null;
  const [m, s] = pace.split("'");
  const total = parseInt(m || "0") * 60 + parseInt((s ?? "0").replace('"', ""));
  return !isNaN(total) && total > 60 ? total : null;
}

export function formatPace(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60);
  const sec = Math.round(totalSeconds % 60);
  return `${min}'${sec.toString().padStart(2, "0")}"`;
}

export function formatPaceColon(totalSec: number): string {
  const min = Math.floor(totalSec / 60);
  const sec = Math.round(totalSec % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function kmhToMinKm(kmh: number): string {
  return formatPaceColon(3600 / kmh);
}

export function paceToKmh(pace: string | null): string | null {
  const sec = parsePaceToSeconds(pace);
  if (!sec) return null;
  return (3600 / sec).toFixed(1);
}

// ─── Duration Utilities ─────────────────────

export function parseDurationToSeconds(dur: string | null): number | null {
  if (!dur) return null;
  const parts = dur.split(":");
  if (parts.length !== 3) return null;
  const [h, m, s] = parts.map(Number);
  if ([h, m, s].some(isNaN)) return null;
  return h * 3600 + m * 60 + s;
}

export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
