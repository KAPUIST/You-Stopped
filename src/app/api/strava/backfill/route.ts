import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActivityStreams, normalizeStreams } from "@/lib/strava";
import { getValidAccessToken } from "@/lib/strava-sync";

export const maxDuration = 60;

/**
 * POST /api/strava/backfill
 * 기존에 임포트된 Strava 기록 중 스트림이 없는 것들을 보강.
 * body: { user_id: string }
 * 한 번에 최대 30건 처리 (rate limit 보호).
 */
export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // 1. Strava 연결 확인 + 토큰 갱신
    const { data: conn, error: connErr } = await supabase
      .from("strava_connections")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (connErr || !conn) {
      return NextResponse.json({ error: "No Strava connection" }, { status: 404 });
    }

    const accessToken = await getValidAccessToken(supabase, conn);
    if (!accessToken) {
      return NextResponse.json(
        { error: "token_expired", detail: "Strava 재연결 필요" },
        { status: 401 }
      );
    }

    // 2. 스트림이 없는 Strava 기록 조회
    const { data: records } = await supabase
      .from("running_records")
      .select("id, source_id")
      .eq("user_id", user_id)
      .eq("source", "strava")
      .not("source_id", "is", null);

    if (!records || records.length === 0) {
      return NextResponse.json({ total: 0, backfilled: 0, skipped: 0, errors: 0 });
    }

    // 이미 스트림이 있는 record_id 목록
    const { data: existingStreams } = await supabase
      .from("activity_streams")
      .select("record_id")
      .in("record_id", records.map((r) => r.id));

    const hasStream = new Set((existingStreams ?? []).map((s) => s.record_id));
    const needBackfill = records.filter((r) => !hasStream.has(r.id));

    // 3. 최대 30건씩 처리 (rate limit 보호: 200/15min)
    const batch = needBackfill.slice(0, 30);
    let backfilled = 0;
    let errors = 0;

    for (const rec of batch) {
      try {
        const rawStreams = await getActivityStreams(accessToken, Number(rec.source_id));
        if (!rawStreams) {
          continue; // 스트림 없는 활동 (수동 등)
        }

        const streamData = normalizeStreams(rawStreams);
        await supabase.from("activity_streams").insert({
          record_id: rec.id,
          stream_data: streamData,
          data_points: streamData.time.length,
        });

        backfilled++;
      } catch (err) {
        console.error(`Backfill failed for record ${rec.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      total: needBackfill.length,
      backfilled,
      remaining: needBackfill.length - batch.length,
      errors,
    });
  } catch (err) {
    console.error("Backfill error:", err);
    return NextResponse.json(
      { error: "Backfill failed", detail: String(err) },
      { status: 500 }
    );
  }
}
