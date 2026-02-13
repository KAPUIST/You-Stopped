import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActivities, StravaActivity } from "@/lib/strava";
import { getValidAccessToken } from "@/lib/strava-sync";

const MAX_IMPORT_PER_USER = 20; // 유저당 1회 임포트 최대 건수

export const maxDuration = 60;

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

    // 3. 활동 목록 전체 가져오기 (페이지네이션) — 목록 조회만 API 사용
    const allActivities: StravaActivity[] = [];
    let page = 1;
    while (true) {
      const activities = await getActivities(accessToken, page, 200);
      if (activities.length === 0) break;
      allActivities.push(...activities);
      if (activities.length < 200) break;
      page++;
    }

    // Run 타입만 필터
    const runActivities = allActivities.filter(
      (a) => a.type === "Run" || a.sport_type === "Run" || a.sport_type === "TrailRun"
    );

    // 4. 이미 임포트된 기록 제외
    const { data: existing } = await supabase
      .from("running_records")
      .select("source_id")
      .eq("user_id", user_id)
      .eq("source", "strava");

    const existingIds = new Set((existing || []).map((r) => r.source_id));

    // 5. 이미 큐에 있는 것 제외
    const { data: existingJobs } = await supabase
      .from("import_jobs")
      .select("strava_activity_id")
      .eq("user_id", user_id)
      .in("status", ["pending", "processing"]);

    const queuedIds = new Set(
      (existingJobs || []).map((j) => String(j.strava_activity_id))
    );

    const allNew = runActivities.filter(
      (a) => !existingIds.has(String(a.id)) && !queuedIds.has(String(a.id))
    );

    // 6. 최대 건수 제한 (최신 활동 우선)
    const newActivities = allNew.slice(0, MAX_IMPORT_PER_USER);
    const skipped = allNew.length - newActivities.length;

    // 7. import_jobs에 bulk insert (status: 'pending')
    if (newActivities.length > 0) {
      const jobs = newActivities.map((a) => ({
        user_id,
        strava_activity_id: a.id,
        status: "pending",
      }));

      const { error: insertErr } = await supabase
        .from("import_jobs")
        .upsert(jobs, { onConflict: "user_id,strava_activity_id", ignoreDuplicates: true });

      if (insertErr) {
        console.error("Failed to queue jobs:", insertErr);
        return NextResponse.json(
          { error: "Queue failed", detail: insertErr.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      total_activities: runActivities.length,
      already_imported: existingIds.size,
      already_queued: queuedIds.size,
      total_queued: newActivities.length,
      skipped_over_limit: skipped,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: "Import failed", detail: String(err) },
      { status: 500 }
    );
  }
}
