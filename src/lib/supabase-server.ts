import { createClient } from "@supabase/supabase-js";

// API Route에서 사용하는 서버 전용 Supabase 클라이언트
// Service Role Key를 사용하여 RLS를 우회 (서버에서만 사용)
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
