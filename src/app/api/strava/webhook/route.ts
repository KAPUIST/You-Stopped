import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getValidAccessToken, importSingleActivity } from "@/lib/strava-sync";

// ═══ GET: Webhook 구독 검증 (Strava가 구독 생성 시 1회 호출) ═══
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    // 검증 성공 → challenge 값을 그대로 돌려줌
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ═══ POST: Webhook 이벤트 수신 (활동 생성/수정/삭제) ═══
export async function POST(req: NextRequest) {
  // Strava는 200을 빠르게 받아야 함 (20초 내)
  // 처리 실패해도 200을 반환해야 재시도 폭주를 방지
  try {
    const event = (await req.json()) as StravaWebhookEvent;

    // activity 이벤트만 처리 (athlete 이벤트는 무시)
    if (event.object_type !== "activity") {
      return NextResponse.json({ ok: true });
    }

    const supabase = createServerSupabase();

    if (event.aspect_type === "create") {
      await handleActivityCreate(supabase, event);
    } else if (event.aspect_type === "update") {
      await handleActivityUpdate(supabase, event);
    } else if (event.aspect_type === "delete") {
      await handleActivityDelete(supabase, event);
    }
  } catch (err) {
    // 에러가 나도 200 반환 — Strava가 재시도하면 중복 처리 위험
    console.error("Webhook processing error:", err);
  }

  return NextResponse.json({ ok: true });
}

// ─── 활동 생성 ───
async function handleActivityCreate(
  supabase: ReturnType<typeof createServerSupabase>,
  event: StravaWebhookEvent
) {
  // owner_id (Strava athlete ID) → user_id 매핑
  const { data: conn } = await supabase
    .from("strava_connections")
    .select("*")
    .eq("strava_athlete_id", event.owner_id)
    .single();

  if (!conn) {
    console.warn(`No connection for Strava athlete ${event.owner_id}`);
    return;
  }

  const accessToken = await getValidAccessToken(supabase, conn);
  if (!accessToken) {
    console.warn(`Token expired for user ${conn.user_id}`);
    return;
  }

  const result = await importSingleActivity(
    accessToken,
    event.object_id,
    conn.user_id,
    supabase
  );
  console.log(`Webhook import activity ${event.object_id}: ${result}`);
}

// ─── 활동 수정 ───
async function handleActivityUpdate(
  supabase: ReturnType<typeof createServerSupabase>,
  event: StravaWebhookEvent
) {
  // title이나 type 변경 시 → 기존 레코드의 notes 업데이트
  // 현재는 title 변경만 처리, 나중에 필요하면 확장
  if (!event.updates?.title) return;

  const { data: conn } = await supabase
    .from("strava_connections")
    .select("user_id")
    .eq("strava_athlete_id", event.owner_id)
    .single();

  if (!conn) return;

  await supabase
    .from("running_records")
    .update({ notes: event.updates.title })
    .eq("user_id", conn.user_id)
    .eq("source", "strava")
    .eq("source_id", String(event.object_id));
}

// ─── 활동 삭제 ───
async function handleActivityDelete(
  supabase: ReturnType<typeof createServerSupabase>,
  event: StravaWebhookEvent
) {
  const { data: conn } = await supabase
    .from("strava_connections")
    .select("user_id")
    .eq("strava_athlete_id", event.owner_id)
    .single();

  if (!conn) return;

  // running_records 삭제 → CASCADE로 splits, best_efforts도 삭제됨
  await supabase
    .from("running_records")
    .delete()
    .eq("user_id", conn.user_id)
    .eq("source", "strava")
    .eq("source_id", String(event.object_id));
}

// ─── Type ───
interface StravaWebhookEvent {
  aspect_type: "create" | "update" | "delete";
  event_time: number;
  object_id: number;       // activity ID
  object_type: "activity" | "athlete";
  owner_id: number;         // Strava athlete ID
  subscription_id: number;
  updates: {
    title?: string;
    type?: string;
    private?: boolean;
    authorized?: boolean;
  };
}
