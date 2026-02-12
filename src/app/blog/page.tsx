import Link from "next/link";
import { Zap, ArrowRight, ArrowLeft } from "lucide-react";
import { posts } from "./posts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "블로그 | youStopped",
  description: "youStopped 빌딩인퍼블릭 스토리. 만드는 과정을 공유합니다.",
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Zap className="h-4 w-4 text-background" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              you<span className="text-accent">Stopped</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/blog"
              className="text-sm font-medium text-accent"
            >
              블로그
            </Link>
            <Link
              href="/#waitlist"
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-all hover:bg-accent-dim hover:scale-105"
            >
              사전 등록
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            홈으로
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            빌딩인퍼블릭
          </h1>
          <p className="mt-3 text-muted">
            youStopped를 만드는 과정을 공유합니다.
          </p>
        </div>
      </section>

      {/* Post list */}
      <section className="pb-32">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <article className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30 hover:bg-card-hover">
                  <div className="flex items-center gap-3 mb-3">
                    <time className="text-xs font-mono text-muted">
                      {post.date}
                    </time>
                  </div>
                  <h2 className="text-lg font-bold group-hover:text-accent transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    {post.description}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                    읽기
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-accent">
              <Zap className="h-3 w-3 text-background" />
            </div>
            <span className="text-sm font-bold">
              you<span className="text-accent">Stopped</span>
            </span>
          </Link>
          <p className="text-xs text-muted">
            &copy; 2026 youStopped. 러닝 데이터, 더 이상 버리지 마세요.
          </p>
        </div>
      </footer>
    </div>
  );
}
