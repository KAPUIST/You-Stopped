"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Check, Loader2 } from "lucide-react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMsg("이메일을 입력해주세요.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.from("waitlist").insert({
      email: email.trim(),
      name: name.trim() || null,
      phone: phone.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        setErrorMsg("이미 등록된 이메일입니다.");
      } else {
        setErrorMsg("문제가 발생했습니다. 다시 시도해주세요.");
      }
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
          등록 완료!
        </h3>
        <p className="text-sm text-muted">
          출시 소식을 가장 먼저 알려드리겠습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md mx-auto">
      <input
        type="email"
        placeholder="이메일 *"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "error") setStatus("idle");
        }}
        required
        className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent/50 focus:bg-card-hover"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="이름 (선택)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent/50 focus:bg-card-hover"
        />
        <input
          type="tel"
          placeholder="연락처 (선택)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent/50 focus:bg-card-hover"
        />
      </div>

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
            출시 알림 신청
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
