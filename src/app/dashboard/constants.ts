// ─── Exercise Type System ────────────────────
// Single source of truth for exercise types and their visual styles.
// Used across: records, overview, shoes pages.

export const EXERCISE_TYPES = ["로드", "트레드밀", "트랙", "트레일"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const TYPE_STYLES: Record<
  string,
  { badge: string; bar: string; dot: string; border: string; bg: string }
> = {
  "로드": {
    badge: "bg-accent/15 text-accent border-accent/20",
    bar: "var(--accent-solid)",
    dot: "bg-accent",
    border: "var(--accent-solid)",
    bg: "transparent",
  },
  "트레드밀": {
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/20",
    bar: "#38bdf8",
    dot: "bg-sky-400",
    border: "#38bdf8",
    bg: "transparent",
  },
  "트랙": {
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    bar: "#f97316",
    dot: "bg-orange-400",
    border: "#f97316",
    bg: "transparent",
  },
  "트레일": {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    bar: "#34d399",
    dot: "bg-emerald-400",
    border: "#34d399",
    bg: "transparent",
  },
};

export const DEFAULT_TYPE_STYLE = {
  badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  bar: "#878787",
  dot: "bg-zinc-400",
  border: "#525252",
  bg: "transparent",
};

export function getTypeStyle(type: string) {
  return TYPE_STYLES[type] ?? DEFAULT_TYPE_STYLE;
}

// ─── Tag System ──────────────────────────────

export const TAG_OPTIONS = ["대회", "장거리", "인터벌", "템포", "회복", "빌드업"] as const;
export type RunningTag = (typeof TAG_OPTIONS)[number];

export const TAG_STYLES: Record<string, string> = {
  "대회": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "장거리": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "인터벌": "bg-red-500/15 text-red-400 border-red-500/20",
  "템포": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "회복": "bg-teal-500/15 text-teal-400 border-teal-500/20",
  "빌드업": "bg-pink-500/15 text-pink-400 border-pink-500/20",
};

export const DEFAULT_TAG_STYLE = "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";

export function getTagStyle(tag: string) {
  return TAG_STYLES[tag] ?? DEFAULT_TAG_STYLE;
}
