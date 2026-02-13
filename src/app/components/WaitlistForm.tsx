"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Send, Check, Loader2 } from "lucide-react";

export default function FeedbackForm() {
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      setErrorMsg("피드백 내용을 입력해주세요.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.from("feedback").insert({
      message: feedback.trim(),
      email: email.trim() || null,
    });

    if (error) {
      setErrorMsg("문제가 발생했습니다. 다시 시도해주세요.");
      setStatus("error");
      return;
    }

    setStatus("success");
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          <Check className="h-6 w-6 text-background" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          감사합니다!
        </h3>
        <p className="text-sm text-muted">
          소중한 피드백이 전달되었습니다. 빠르게 반영하겠습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md mx-auto">
      <textarea
        placeholder="불편한 점이나 추가되었으면 하는 기능을 알려주세요"
        value={feedback}
        onChange={(e) => {
          setFeedback(e.target.value);
          if (status === "error") setStatus("idle");
        }}
        rows={3}
        className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent/50 focus:bg-card-hover resize-none"
      />
      <input
        type="email"
        placeholder="이메일 (선택 · 답변 받으실 경우)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent/50 focus:bg-card-hover"
      />

      {status === "error" && (
        <p className="text-xs text-red-400 text-center">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-bold text-background transition-all hover:bg-accent-dim hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            피드백 보내기
            <Send className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
