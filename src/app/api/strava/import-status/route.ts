import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getValidAccessToken, importSingleActivity } from "@/lib/strava-sync";
import { canMakeRequests, consumeRequests } from "@/lib/rate-limit";

const PROCESS_PER_POLL = 2; // 폴링 1회당 최대 처리 건수
const MAX_ATTEMPTS = 3;

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // ── 1. pending 작업이 있으면 몇 건 처리 ──
  const { data: pendingJobs } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(PROCESS_PER_POLL);

  if (pendingJobs && pendingJobs.length > 0) {
    // 토큰 1회만 조회
    const { data: conn } = await supabase
      .from("strava_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    let accessToken: string | null = null;
    if (conn) {
      accessToken = await getValidAccessToken(supabase, conn);
    }

    for (const job of pendingJobs) {
      // rate limit 확인
      if (!(await canMakeRequests(2))) break;

      if (!accessToken) {
        await supabase
          .from("import_jobs")
          .update({ status: "error", error_message: "No valid access token", processed_at: new Date().toISOString() })
          .eq("id", job.id);
        continue;
      }

      // processing 상태로 전환
      await supabase
        .from("import_jobs")
        .update({ status: "processing" })
        .eq("id", job.id);

      try {
        const result = await importSingleActivity(accessToken, job.strava_activity_id, userId, supabase);
        await consumeRequests(2);

        if (result === "imported" || result === "exists" || result === "skipped") {
          await supabase
            .from("import_jobs")
            .update({ status: "done", processed_at: new Date().toISOString() })
            .eq("id", job.id);
        } else {
          const newAttempts = (job.attempts || 0) + 1;
          await supabase
            .from("import_jobs")
            .update({
              status: newAttempts >= MAX_ATTEMPTS ? "error" : "pending",
              attempts: newAttempts,
              error_message: `Import returned: ${result}`,
              processed_at: newAttempts >= MAX_ATTEMPTS ? new Date().toISOString() : null,
            })
            .eq("id", job.id);
        }
      } catch (err) {
        const newAttempts = (job.attempts || 0) + 1;
        await supabase
          .from("import_jobs")
          .update({
            status: newAttempts >= MAX_ATTEMPTS ? "error" : "pending",
            attempts: newAttempts,
            error_message: String(err).slice(0, 500),
            processed_at: newAttempts >= MAX_ATTEMPTS ? new Date().toISOString() : null,
          })
          .eq("id", job.id);
        await consumeRequests(2);
      }
    }
  }

  // ── 2. 최종 상태 집계 후 반환 ──
  const { data: allJobs, error } = await supabase
    .from("import_jobs")
    .select("status")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = { pending: 0, processing: 0, done: 0, error: 0, cancelled: 0, total: 0 };

  for (const job of allJobs || []) {
    counts.total++;
    const s = job.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  }

  return NextResponse.json(counts);
}
