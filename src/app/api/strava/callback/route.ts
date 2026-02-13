import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { exchangeCode } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // user_id
  const error = url.searchParams.get("error");

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`;

  // 사용자가 거부하거나 에러가 발생한 경우
  if (error || !code || !state) {
    return NextResponse.redirect(
      `${dashboardUrl}?strava_error=${error || "missing_params"}`
    );
  }

  try {
    // 1. code → access_token 교환
    const tokenData = await exchangeCode(code);

    // 2. Supabase에 연결 정보 저장
    const supabase = createServerSupabase();
    const { error: dbError } = await supabase
      .from("strava_connections")
      .upsert(
        {
          user_id: state,
          strava_athlete_id: tokenData.athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          scope: "activity:read_all",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      console.error("Failed to save Strava connection:", dbError);
      return NextResponse.redirect(`${dashboardUrl}?strava_error=db_error`);
    }

    // 3. 대시보드로 리다이렉트 (성공)
    return NextResponse.redirect(`${dashboardUrl}?strava_connected=true`);
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.redirect(`${dashboardUrl}?strava_error=exchange_failed`);
  }
}
