// Strava API Rate Limit 관리
// 앱 전체 공유: Read 100회/15분, 1,000회/일 | Overall 200회/15분, 2,000회/일
// Read limit이 더 타이트하므로 Read 기준으로 관리

import { createServerSupabase } from "@/lib/supabase-server";

const LIMIT_15MIN = 100;
const LIMIT_DAILY = 1000;
// Cron 배치용 예산 (나머지는 웹훅용 안전 마진)
const BATCH_BUDGET_15MIN = 80;

interface RateLimitRow {
  id: string;
  requests_15min: number;
  requests_daily: number;
  window_reset_at: string;
  day_reset_at: string;
  updated_at: string;
}

/** 현재 rate limit 상태를 가져오고, 윈도우 만료 시 리셋 */
async function getState(): Promise<RateLimitRow> {
  const supabase = createServerSupabase();
  const now = new Date();

  const { data, error } = await supabase
    .from("rate_limit_state")
    .select("*")
    .eq("id", "global")
    .single();

  if (error || !data) {
    throw new Error("rate_limit_state row not found");
  }

  const state = data as RateLimitRow;
  let needsUpdate = false;

  // 15분 윈도우 리셋
  if (new Date(state.window_reset_at) <= now) {
    state.requests_15min = 0;
    state.window_reset_at = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    needsUpdate = true;
  }

  // 일간 리셋
  if (new Date(state.day_reset_at) <= now) {
    state.requests_daily = 0;
    // 다음 날 00:00 UTC
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    state.day_reset_at = tomorrow.toISOString();
    needsUpdate = true;
  }

  if (needsUpdate) {
    await supabase
      .from("rate_limit_state")
      .update({
        requests_15min: state.requests_15min,
        requests_daily: state.requests_daily,
        window_reset_at: state.window_reset_at,
        day_reset_at: state.day_reset_at,
        updated_at: now.toISOString(),
      })
      .eq("id", "global");
  }

  return state;
}

/** 배치 처리용: count회 API 호출이 가능한지 확인 */
export async function canMakeRequests(count: number): Promise<boolean> {
  const state = await getState();
  return (
    state.requests_15min + count <= BATCH_BUDGET_15MIN &&
    state.requests_daily + count <= LIMIT_DAILY
  );
}

/** API 호출 후 카운터 증가 */
export async function consumeRequests(count: number): Promise<void> {
  const supabase = createServerSupabase();
  const now = new Date().toISOString();

  // Supabase JS SDK에는 increment가 없으므로 현재 값을 읽고 업데이트
  const state = await getState();

  await supabase
    .from("rate_limit_state")
    .update({
      requests_15min: state.requests_15min + count,
      requests_daily: state.requests_daily + count,
      updated_at: now,
    })
    .eq("id", "global");
}

/** 현재 사용 가능한 API 호출 수 조회 */
export async function getRateLimitStatus(): Promise<{
  available15min: number;
  availableDaily: number;
  requests15min: number;
  requestsDaily: number;
}> {
  const state = await getState();
  return {
    available15min: Math.max(0, LIMIT_15MIN - state.requests_15min),
    availableDaily: Math.max(0, LIMIT_DAILY - state.requests_daily),
    requests15min: state.requests_15min,
    requestsDaily: state.requests_daily,
  };
}
