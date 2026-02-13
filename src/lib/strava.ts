// Strava API 헬퍼 함수들

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

export function getStravaAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!,
    response_type: "code",
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/strava/callback`,
    scope: "activity:read_all",
    approval_prompt: "auto",
    state,
  });
  return `${STRAVA_AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: { id: number; firstname: string; lastname: string };
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }>;
}

export async function getActivities(
  accessToken: string,
  page = 1,
  perPage = 200
) {
  const res = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?page=${page}&per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Activities fetch failed: ${res.status}`);
  return res.json() as Promise<StravaActivity[]>;
}

export async function getActivityDetail(accessToken: string, activityId: number) {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Activity detail failed: ${res.status}`);
  return res.json() as Promise<StravaDetailedActivity>;
}

// --- Types ---

export interface StravaActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  trainer: boolean;
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate: boolean;
  average_cadence?: number;
  suffer_score?: number;
  gear_id: string | null;
  map: { summary_polyline: string };
  workout_type: number | null;
  pr_count: number;
}

export interface StravaSplit {
  split: number;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_speed: number;
  average_heartrate?: number;
  elevation_difference: number;
  pace_zone: number;
}

export interface StravaBestEffort {
  name: string;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  pr_rank: number | null;
}

export interface StravaDetailedActivity extends StravaActivity {
  description: string | null;
  calories: number;
  splits_metric: StravaSplit[];
  best_efforts: StravaBestEffort[];
  laps: Array<{
    name: string;
    distance: number;
    elapsed_time: number;
    moving_time: number;
    average_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
  }>;
  map: { polyline: string; summary_polyline: string };
}
