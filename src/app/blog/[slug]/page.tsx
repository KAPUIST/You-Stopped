import Link from "next/link";
import { notFound } from "next/navigation";
import { Zap, ArrowLeft } from "lucide-react";
import { posts, getPostBySlug } from "../posts";
import type { Metadata } from "next";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | youStopped 블로그`,
    description: post.description,
  };
}

function renderContent(content: string) {
  const blocks = content.split("\n\n");
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Horizontal rule
    if (trimmed === "---") {
      return (
        <hr key={i} className="my-8 border-border" />
      );
    }

    // H2 heading
    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={i}
          className="text-xl font-bold mt-10 mb-4 text-accent"
        >
          {trimmed.slice(3)}
        </h2>
      );
    }

    // Regular paragraph - handle bold and line breaks
    const lines = trimmed.split("\n");
    return (
      <p key={i} className="text-base leading-relaxed text-foreground/75 mb-4">
        {lines.map((line, j) => {
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <span key={j}>
              {j > 0 && <br />}
              {parts.map((part, k) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong key={k} className="text-foreground font-semibold">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={k}>{part}</span>;
              })}
            </span>
          );
        })}
      </p>
    );
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

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
              className="text-sm font-medium text-foreground hover:text-accent transition-colors"
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

      {/* Article */}
      <article className="pt-32 pb-32">
        <div className="mx-auto max-w-2xl px-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            글 목록
          </Link>

          <header className="mb-10">
            <time className="text-xs font-mono text-muted">{post.date}</time>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-3 text-muted">{post.description}</p>
          </header>

          <div className="border-t border-border pt-8">
            {renderContent(post.content)}
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl border border-accent/20 bg-accent/5 p-8 text-center">
            <p className="text-lg font-bold mb-2">
              같이 만들어가고 싶다면?
            </p>
            <p className="text-sm text-muted mb-6">
              러닝 생활의 불편함을 알려주세요. 해결해드리겠습니다.
            </p>
            <Link
              href="/#waitlist"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-background transition-all hover:bg-accent-dim hover:scale-105"
            >
              사전 등록하기
            </Link>
          </div>
        </div>
      </article>

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
