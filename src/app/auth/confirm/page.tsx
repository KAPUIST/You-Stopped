"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    // Listen for auth state change (handles hash fragment from implicit flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "SIGNED_IN") {
        setStatus("success");
        setTimeout(() => router.replace("/dashboard"), 1500);
      }
    });

    // Handle PKCE flow: token_hash in query params
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type") as "signup" | "email" | "recovery" | "invite" | null;

    if (tokenHash && type) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        .then(({ error }) => {
          if (cancelled) return;
          if (error) {
            setStatus("error");
            setErrorMsg(error.message);
          }
          // success case is handled by onAuthStateChange
        });
    }

    // Timeout: if nothing happens in 8s, likely an invalid/expired link
    const timeout = setTimeout(() => {
      if (!cancelled && status === "verifying") {
        setStatus("error");
        setErrorMsg("인증 링크가 만료되었거나 유효하지 않습니다.");
      }
    }, 8000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="h-10 w-10 text-accent mx-auto mb-4 animate-spin" />
            <h1 className="text-lg font-bold text-foreground mb-2">이메일 인증 중</h1>
            <p className="text-sm text-muted">잠시만 기다려주세요...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-accent mx-auto mb-4" />
            <h1 className="text-lg font-bold text-foreground mb-2">인증 완료!</h1>
            <p className="text-sm text-muted">대시보드로 이동합니다...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-foreground mb-2">인증 실패</h1>
            <p className="text-sm text-muted mb-4">{errorMsg}</p>
            <a
              href="/login"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              로그인 페이지로
            </a>
          </>
        )}
      </div>
    </div>
  );
}
