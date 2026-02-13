"use client";

import { Zap } from "lucide-react";

export function NavLogo() {
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="flex items-center gap-2 cursor-pointer"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
        <Zap className="h-4 w-4 text-background" />
      </div>
      <span className="text-lg font-bold tracking-tight">
        you<span className="text-accent">Stopped</span>
      </span>
    </button>
  );
}
