"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, LogIn, Mail, RotateCw, UserPlus, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Email verification state
  const [signupDone, setSignupDone] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
      else setReady(true);
    });
  }, [router]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [resendCooldown]);

  const switchMode = (next: "login" | "signup") => {
    if (next === mode) return;
    setMode(next);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setErrorMsg("");
    setStatus("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setErrorMsg("이메일과 비밀번호를 입력해주세요.");
      setStatus("error");
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setErrorMsg("비밀번호가 일치하지 않습니다.");
        setStatus("error");
        return;
      }
    }

    setStatus("loading");
    setErrorMsg("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Supabase auth error:", error.message, error.status);
        setErrorMsg(localizeLoginError(error.message));
        setStatus("error");
        return;
      }

      router.push("/dashboard");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        console.error("Supabase signup error:", error.message, error.status);
        setErrorMsg(localizeSignupError(error.message));
        setStatus("error");
        return;
      }

      if (data.user?.identities?.length === 0) {
        setErrorMsg("이미 가입된 이메일입니다.");
        setStatus("error");
        return;
      }

      setSignupEmail(email.trim());
      setSignupDone(true);
      setResendCooldown(60);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: signupEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    setResending(false);

    if (error) {
      console.error("Resend error:", error.message);
      return;
    }

    setResendCooldown(60);
  }, [resendCooldown, resending, signupEmail]);

  const backToLogin = () => {
    setSignupDone(false);
    setSignupEmail("");
    setMode("login");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setErrorMsg("");
    setStatus("idle");
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-accent/3 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center animate-pulse-glow">
            <Zap className="h-6 w-6 text-accent" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              you<span className="text-accent">Stopped</span>
            </h1>
            <p className="text-[11px] text-muted font-mono mt-1 tracking-widest uppercase">
              Running Data
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-lg">
          {signupDone ? (
            /* ─── Email verification screen ─── */
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Mail className="h-7 w-7 text-accent" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-foreground">
                  인증 메일을 확인해주세요
                </h2>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  <span className="font-mono text-foreground text-xs">
                    {signupEmail}
                  </span>
                  <br />
                  으로 인증 링크를 보냈습니다.
                </p>
              </div>

              <div className="w-full rounded-lg bg-accent/5 border border-accent/15 px-4 py-3">
                <p className="text-xs text-muted leading-relaxed">
                  메일함에서 인증 링크를 클릭한 후,
                  <br />
                  아래 로그인 버튼으로 시작하세요.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" />
                )}
                {resendCooldown > 0
                  ? `재발송 (${resendCooldown}초)`
                  : "인증 메일 재발송"}
              </button>

              <button
                type="button"
                onClick={backToLogin}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-bold text-background transition-all hover:bg-accent-dim hover:scale-[1.02] active:scale-[0.98] w-full mt-1"
              >
                로그인하러 가기
                <LogIn className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* ─── Login / Signup form ─── */
            <>
              {/* Segment control tabs */}
              <div className="flex rounded-xl bg-surface p-1 mb-5">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    mode === "login"
                      ? "bg-accent text-background shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    mode === "signup"
                      ? "bg-accent text-background shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  회원가입
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1.5 ml-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-all focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1.5 ml-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    placeholder="6자 이상"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-all focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
                  />
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="block text-xs text-muted mb-1.5 ml-1">
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (status === "error") setStatus("idle");
                      }}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-all focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
                    />
                  </div>
                )}

                {status === "error" && (
                  <div className="rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2">
                    <p className="text-xs text-red-400 text-center">
                      {errorMsg}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-bold text-background transition-all hover:bg-accent-dim hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 mt-1"
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "login" ? (
                    <>
                      로그인
                      <LogIn className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      가입하기
                      <UserPlus className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted mt-6">
          &copy; 2026 youStopped
        </p>
      </div>
    </div>
  );
}

function localizeLoginError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("Email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.";
  }
  return `로그인 실패: ${message}`;
}

function localizeSignupError(message: string): string {
  if (message.includes("User already registered")) {
    return "이미 가입된 이메일입니다.";
  }
  if (message.includes("Password should be at least 6 characters")) {
    return "비밀번호는 6자 이상이어야 합니다.";
  }
  return `가입 실패: ${message}`;
}
