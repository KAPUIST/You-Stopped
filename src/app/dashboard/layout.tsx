"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DashboardContext, type RunningRecord, type Shoe } from "./context";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  TableProperties,
  BarChart3,
  FileText,
  Footprints,
  LogOut,
  Loader2,
  Zap,
  Sun,
  Moon,
  Monitor,
  Check,
  User,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

const STRAVA_BRAND = "#FC4C02";

const NAV_ITEMS = [
  { href: "/dashboard", label: "오버뷰", icon: LayoutDashboard, active: true },
  { href: "/dashboard/records", label: "기록", icon: TableProperties, active: true },
  { href: "/dashboard/shoes", label: "신발", icon: Footprints, active: true },
  { href: "#", label: "분석", icon: BarChart3, active: false },
  { href: "#", label: "성적표", icon: FileText, active: false },
];

const THEME_OPTIONS = [
  { value: "dark", label: "다크", icon: Moon },
  { value: "light", label: "라이트", icon: Sun },
  { value: "system", label: "시스템", icon: Monitor },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [records, setRecords] = useState<RunningRecord[]>([]);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [authed, setAuthed] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      setAuthed(true);
      setUserName(session.user.email ?? "");
      setUserId(session.user.id);

      // Strava 연결 상태 확인
      const { data: stravaConn } = await supabase
        .from("strava_connections")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (stravaConn) setStravaConnected(true);

      const [recordsRes, shoesRes] = await Promise.all([
        supabase
          .from("running_records")
          .select(
            "id, date, exercise_type, distance_km, duration, pace_kmh, pace_minkm, cadence, avg_heart_rate, notes, shoe_id, tags"
          )
          .order("date", { ascending: false }),
        supabase
          .from("shoes")
          .select("*")
          .order("created_at", { ascending: true }),
      ]);

      if (recordsRes.error) {
        console.error("기록 조회 실패:", recordsRes.error);
      } else {
        setRecords(recordsRes.data ?? []);
      }

      if (shoesRes.error) {
        console.error("신발 조회 실패:", shoesRes.error);
      } else {
        setShoes(shoesRes.data ?? []);
      }

      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleStravaConnect = () => {
    if (!userId) return;
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!,
      response_type: "code",
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/strava/callback`,
      scope: "activity:read_all",
      approval_prompt: "auto",
      state: userId,
    });
    window.location.href = `https://www.strava.com/oauth/authorize?${params}`;
  };

  const handleStravaSync = async () => {
    if (!userId || syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/strava/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (res.status === 401 && data.error === "token_expired") {
        // refresh token 무효화 → 재연결 필요
        setStravaConnected(false);
        setSyncResult("재연결 필요");
        return;
      }
      if (data.newly_imported > 0) {
        setSyncResult(`${data.newly_imported}건 새로 동기화`);
        // 데이터 새로고침
        const { data: newRecords } = await supabase
          .from("running_records")
          .select("id, date, exercise_type, distance_km, duration, pace_kmh, pace_minkm, cadence, avg_heart_rate, notes, shoe_id, tags")
          .order("date", { ascending: false });
        if (newRecords) setRecords(newRecords);
      } else {
        setSyncResult("이미 최신 상태");
      }
    } catch {
      setSyncResult("동기화 실패");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  // ?strava_connected=true 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("strava_connected") === "true") {
      setStravaConnected(true);
      // URL 정리
      window.history.replaceState({}, "", pathname);
      // 자동 동기화 시작
      setTimeout(() => handleStravaSync(), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (!authed && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={{ records, shoes, loading, userName }}>
      <div className="min-h-screen flex bg-background max-w-[100vw] overflow-x-hidden">
        {/* ═══ Desktop Sidebar ═══════════════════════ */}
        <aside className="hidden md:flex fixed top-0 left-0 h-screen w-[220px] border-r border-border/60 bg-background flex-col z-50">
          {/* Brand — h-12 matches top bar */}
          <div className="h-12 px-5 border-b border-border/40 flex items-center">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground tracking-tight leading-none">
                  youStopped
                </p>
                <p className="text-[10px] text-muted mt-0.5 font-mono">
                  RUNNING DATA
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href) && item.href !== "/dashboard";
              const Icon = item.icon;

              return item.active ? (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-accent/8 text-accent border border-accent/15"
                      : "text-muted hover:text-foreground hover:bg-card-hover border border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ) : (
                <div
                  key={item.label}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted/60 border border-transparent cursor-not-allowed"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-auto text-[9px] font-mono bg-card px-1.5 py-0.5 rounded text-muted/60">
                    SOON
                  </span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ═══ Mobile Bottom Nav ═════════════════════ */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60">
          <div className="flex items-center justify-around px-2 py-1 pb-[env(safe-area-inset-bottom)]">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href) && item.href !== "/dashboard";
              const Icon = item.icon;

              return item.active ? (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all min-w-[56px] ${
                    isActive
                      ? "text-accent"
                      : "text-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              ) : (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[56px] text-muted/60 cursor-not-allowed"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="md:ml-[220px] flex-1 min-h-screen pb-20 md:pb-0 overflow-x-hidden">
          {/* ═══ Top Bar ═══════════════════════════════ */}
          <div className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 lg:px-8 h-12 border-b border-border/40 bg-background/95 backdrop-blur-md">
            {/* Mobile Brand */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="h-7 w-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-accent" />
              </div>
              <span className="text-sm font-bold text-foreground tracking-tight">youStopped</span>
            </div>
            <div className="hidden md:block" />

            {/* User Avatar Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="h-8 w-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center hover:bg-accent/20 transition-colors"
              >
                <User className="h-4 w-4 text-accent" />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 z-[60] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-border/50">
                    <p className="text-sm font-medium text-foreground truncate">
                      {userName.split("@")[0]}
                    </p>
                    <p className="text-xs text-muted truncate font-mono mt-0.5">
                      {userName}
                    </p>
                  </div>

                  {/* Theme */}
                  {mounted && (
                    <div className="px-2 py-2 border-b border-border/50">
                      <p className="px-2 py-1 text-xs text-muted">Theme</p>
                      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => { setTheme(value); setDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm hover:bg-card-hover transition-colors"
                        >
                          {theme === value ? (
                            <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}
                          <Icon className="h-3.5 w-3.5 text-muted shrink-0" />
                          <span className={theme === value ? "text-foreground font-medium" : "text-muted"}>
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Strava */}
                  <div className="px-2 py-2 border-b border-border/50">
                    <p className="px-2 py-1 text-xs text-muted">연동</p>
                    {stravaConnected ? (
                      <>
                        <div className="flex items-center gap-3 px-2 py-1.5 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: STRAVA_BRAND }} />
                          <span className="text-foreground font-medium">Strava 연결됨</span>
                        </div>
                        <button
                          onClick={() => { handleStravaSync(); setDropdownOpen(false); }}
                          disabled={syncing}
                          className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm hover:bg-card-hover transition-colors text-muted"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`} />
                          <span>{syncing ? "동기화 중..." : syncResult || "지금 동기화"}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { handleStravaConnect(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm hover:bg-card-hover transition-colors text-muted"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" style={{ color: STRAVA_BRAND }} />
                        <span>Strava 연결하기</span>
                      </button>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="px-2 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm text-muted hover:text-red-400 hover:bg-red-400/5 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  );
}
