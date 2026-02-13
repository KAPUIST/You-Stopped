import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActivities, StravaActivity } from "@/lib/strava";
import { getValidAccessToken, importSingleActivity } from "@/lib/strava-sync";

export const maxDuration = 60; // Vercel function timeout 60초

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // 1. Strava 연결 정보 가져오기
    const { data: conn, error: connErr } = await supabase
      .from("strava_connections")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (connErr || !conn) {
      return NextResponse.json({ error: "No Strava connection" }, { status: 404 });
    }

    // 2. 유효한 토큰 가져오기 (만료 시 자동 갱신)
    const accessToken = await getValidAccessToken(supabase, conn);
    if (!accessToken) {
      return NextResponse.json(
        { error: "token_expired", detail: "Strava 재연결이 필요합니다" },
        { status: 401 }
      );
    }

    // 3. 활동 목록 전체 가져오기 (페이지네이션)
    const allActivities: StravaActivity[] = [];
    let page = 1;
    while (true) {
      const activities = await getActivities(accessToken, page, 200);
      if (activities.length === 0) break;
      allActivities.push(...activities);
      if (activities.length < 200) break;
      page++;
    }

    // Run 타입만 필터 (Ride, Swim 등 제외)
    const runActivities = allActivities.filter(
      (a) => a.type === "Run" || a.sport_type === "Run" || a.sport_type === "TrailRun"
    );

    // 4. 이미 임포트된 기록 확인 (중복 방지)
    const { data: existing } = await supabase
      .from("running_records")
      .select("source_id")
      .eq("user_id", user_id)
      .eq("source", "strava");

    const existingIds = new Set((existing || []).map((r) => r.source_id));
    const newActivities = runActivities.filter(
      (a) => !existingIds.has(String(a.id))
    );

    // 5. 새 활동을 상세 조회 → DB에 저장
    let imported = 0;
    let errors = 0;

    for (const activity of newActivities) {
      const result = await importSingleActivity(accessToken, activity.id, user_id, supabase);
      if (result === "imported") imported++;
      else if (result === "error") errors++;
    }

    return NextResponse.json({
      total: runActivities.length,
      already_imported: existingIds.size,
      newly_imported: imported,
      errors,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: "Import failed", detail: String(err) },
      { status: 500 }
    );
  }
}
