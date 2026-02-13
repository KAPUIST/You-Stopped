// Strava 활동 → DB 저장 공통 로직
// import route (일괄)과 webhook (단건) 양쪽에서 사용

import { createServerSupabase } from "@/lib/supabase-server";
import {
  getActivityDetail,
  getActivityStreams,
  normalizeStreams,
  refreshAccessToken,
  StravaDetailedActivity,
} from "@/lib/strava";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * strava_connections에서 유효한 access_token을 가져온다.
 * 만료됐으면 자동 갱신, 갱신 실패 시 연결 삭제 후 null 반환.
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  conn: { user_id: string; access_token: string; refresh_token: string; expires_at: number }
): Promise<string | null> {
  if (conn.expires_at > Date.now() / 1000) {
    return conn.access_token;
  }

  try {
    const refreshed = await refreshAccessToken(conn.refresh_token);
    await supabase
      .from("strava_connections")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", conn.user_id);
    return refreshed.access_token;
  } catch {
    // refresh token 무효화 → 연결 삭제
    await supabase
      .from("strava_connections")
      .delete()
      .eq("user_id", conn.user_id);
    return null;
  }
}

/**
 * Strava 활동 1건을 상세 조회 → running_records + splits + best_efforts에 저장.
 * 이미 존재하면 skip, 러닝이 아니면 skip.
 * 반환: "imported" | "skipped" | "exists" | "error"
 */
export async function importSingleActivity(
  accessToken: string,
  activityId: number,
  userId: string,
  supabase?: SupabaseClient
): Promise<"imported" | "skipped" | "exists" | "error"> {
  const sb = supabase ?? createServerSupabase();

  try {
    // 중복 체크
    const { data: existing } = await sb
      .from("running_records")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "strava")
      .eq("source_id", String(activityId))
      .maybeSingle();

    if (existing) return "exists";

    // 상세 조회
    const detail = await getActivityDetail(accessToken, activityId);

    // 러닝만 처리
    if (detail.type !== "Run" && detail.sport_type !== "Run" && detail.sport_type !== "TrailRun") {
      return "skipped";
    }

    // running_records 저장
    const record = stravaToRecord(detail, userId);
    const { data: inserted, error: insertErr } = await sb
      .from("running_records")
      .insert(record)
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error(`Failed to insert activity ${activityId}:`, insertErr);
      return "error";
    }

    // splits 저장
    if (detail.splits_metric?.length > 0) {
      const splits = detail.splits_metric
        .filter((s) => s.distance > 50)
        .map((s) => ({
          record_id: inserted.id,
          split_num: s.split,
          distance_m: s.distance,
          elapsed_time: s.elapsed_time,
          moving_time: s.moving_time,
          avg_speed: s.average_speed,
          avg_heartrate: s.average_heartrate || null,
          elevation_diff: s.elevation_difference,
          pace_zone: s.pace_zone,
        }));

      if (splits.length > 0) {
        await sb.from("activity_splits").insert(splits);
      }
    }

    // best_efforts 저장
    if (detail.best_efforts?.length > 0) {
      const efforts = detail.best_efforts.map((b) => ({
        record_id: inserted.id,
        name: b.name,
        distance: b.distance,
        elapsed_time: b.elapsed_time,
        moving_time: b.moving_time,
        pr_rank: b.pr_rank,
      }));

      await sb.from("activity_best_efforts").insert(efforts);
    }

    // streams 저장 (실패해도 레코드 임포트는 유지)
    try {
      const rawStreams = await getActivityStreams(accessToken, activityId);
      if (rawStreams) {
        const streamData = normalizeStreams(rawStreams);
        await sb.from("activity_streams").insert({
          record_id: inserted.id,
          stream_data: streamData,
          data_points: streamData.time.length,
        });
      }
    } catch (streamErr) {
      console.warn(`Streams fetch failed for activity ${activityId}:`, streamErr);
      // 스트림 실패는 무시 — 기본 레코드는 이미 저장됨
    }

    return "imported";
  } catch (err) {
    console.error(`Error importing activity ${activityId}:`, err);
    return "error";
  }
}

// Strava 활동 → running_records 레코드 변환
export function stravaToRecord(a: StravaDetailedActivity, userId: string) {
  let exerciseType = "로드";
  if (a.trainer) exerciseType = "트레드밀";
  else if (a.sport_type === "TrailRun") exerciseType = "트레일";

  const paceKmh = a.average_speed * 3.6;

  let paceMinkm: string | null = null;
  if (a.average_speed > 0) {
    const secPerKm = 1000 / a.average_speed;
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.round(secPerKm % 60);
    paceMinkm = `${mins}'${secs.toString().padStart(2, "0")}"`;
  }

  const hours = Math.floor(a.moving_time / 3600);
  const mins = Math.floor((a.moving_time % 3600) / 60);
  const secs = a.moving_time % 60;
  const duration = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  const eH = Math.floor(a.elapsed_time / 3600);
  const eM = Math.floor((a.elapsed_time % 3600) / 60);
  const eS = a.elapsed_time % 60;
  const elapsedStr = `${eH.toString().padStart(2, "0")}:${eM.toString().padStart(2, "0")}:${eS.toString().padStart(2, "0")}`;

  const tags: string[] = [];
  if (a.workout_type === 1) tags.push("대회");
  else if (a.workout_type === 2) tags.push("장거리");
  else if (a.workout_type === 3) tags.push("인터벌");

  const maxSpeedKmh = a.max_speed * 3.6;

  return {
    user_id: userId,
    date: a.start_date_local.split("T")[0],
    exercise_type: exerciseType,
    distance_km: Math.round((a.distance / 1000) * 1000) / 1000,
    duration,
    pace_kmh: Math.round(paceKmh * 10) / 10,
    pace_minkm: paceMinkm,
    cadence: a.average_cadence ? Math.round(a.average_cadence * 2) : null,
    avg_heart_rate: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    notes: a.description || a.name,
    tags,
    source: "strava",
    source_id: String(a.id),
    max_heart_rate: a.max_heartrate ? Math.round(a.max_heartrate) : null,
    calories: a.calories || null,
    elevation_gain: a.total_elevation_gain || null,
    suffer_score: a.suffer_score || null,
    max_speed: Math.round(maxSpeedKmh * 100) / 100,
    elapsed_time: elapsedStr,
    avg_temp: null,
    map_polyline: a.map?.polyline || a.map?.summary_polyline || null,
  };
}
