import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="relative z-20 flex items-center justify-between px-5 py-4 md:px-8">
      <Link href="/" className="group flex items-center gap-3">
        <span
          className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/80 to-cyan-400/80"
          aria-hidden
        >
          <span className="absolute inset-x-1.5 bottom-2 flex h-3 items-end justify-between gap-0.5">
            <span className="w-0.5 animate-pulse rounded-full bg-slate-950/80 [animation-delay:0ms] h-2" />
            <span className="w-0.5 animate-pulse rounded-full bg-slate-950/80 [animation-delay:120ms] h-3" />
            <span className="w-0.5 animate-pulse rounded-full bg-slate-950/80 [animation-delay:240ms] h-1.5" />
            <span className="w-0.5 animate-pulse rounded-full bg-slate-950/80 [animation-delay:80ms] h-2.5" />
          </span>
        </span>
        <span className="font-[family-name:var(--font-syne)] text-lg tracking-tight text-white">
          Vocalift
        </span>
      </Link>
      <nav className="flex items-center gap-3 text-sm text-white/50">
        <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs tracking-wide text-white/55 sm:inline">
          V0 · Mastering
        </span>
        <Link
          href="/"
          className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3.5 py-1.5 text-cyan-100 transition hover:bg-cyan-400/20"
        >
          새 트랙
        </Link>
      </nav>
    </header>
  );
}
