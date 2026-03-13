"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BarChart3, History, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { CubixLogo } from "@/components/ui/cubix-logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/analysis/new", label: "New Analysis", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
];

const sectionMeta: Record<string, { title: string; copy: string }> = {
  "/dashboard": {
    title: "Commerce Visibility Command Center",
    copy: "Monitor assistant visibility, source quality, and factual trust from one workspace.",
  },
  "/analysis/new": {
    title: "Launch A Monitoring Run",
    copy: "Capture product-level visibility and source evidence across assistant-style shopping prompts.",
  },
  "/history": {
    title: "Saved Monitoring Runs",
    copy: "Review historical reports, trust signals, and the progress of each product over time.",
  },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();
  const currentSection = navItems.find((item) => pathname.startsWith(item.href));
  const section = currentSection ? sectionMeta[currentSection.href] : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#fff1e6_0%,_#f8fafc_40%,_#f8fafc_100%)]">
      <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-6 px-4 py-5 xl:grid-cols-[292px_minmax(0,1fr)] xl:px-6">
        <aside className="glass-panel flex flex-col rounded-[30px] border border-white/60 p-4 shadow-[var(--shadow-lg)]">
          <div className="overflow-hidden rounded-[26px] border border-orange-200/60 bg-[linear-gradient(145deg,_rgba(255,244,230,0.96)_0%,_rgba(255,255,255,0.88)_52%,_rgba(255,234,216,0.96)_100%)] p-5">
            <CubixLogo />
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Measure assistant share of shelf, source trust, and factual accuracy in one place.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="neutral">OpenAI grounded</Badge>
              <Badge tone="neutral">Firestore history</Badge>
            </div>
          </div>

          <nav className="mt-5 space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-sm font-medium transition",
                    active
                      ? "border-orange-200 bg-[linear-gradient(135deg,_rgba(255,244,230,0.95)_0%,_rgba(255,255,255,0.9)_100%)] text-orange-700 shadow-[0_14px_30px_rgba(239,125,50,0.12)]"
                      : "border-transparent bg-white/55 text-slate-600 hover:border-slate-200 hover:bg-white/80 hover:text-slate-900",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-xl border p-2.5 transition",
                        active ? "border-orange-200 bg-orange-100/70" : "border-slate-200 bg-white/70 group-hover:border-orange-200",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </span>
                  <ArrowUpRight className={cn("h-4 w-4 transition", active ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-950 p-4 text-white shadow-[0_18px_36px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">Trust Layer</p>
                <p className="mt-2 text-sm font-semibold text-white">Human-review mode active</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-orange-300" />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">Flagged claims stay visible until the evidence improves.</p>
          </div>

          <div className="mt-auto rounded-[24px] border border-slate-200/80 bg-white/72 p-4">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.email}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Authenticated workspace</p>
            <button
              type="button"
              onClick={signOutUser}
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="space-y-6">
          <section className="page-hero px-6 py-6 md:px-8 md:py-7">
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl">
                <p className="eyebrow">{currentSection?.label ?? "Workspace"}</p>
                <h2 className="page-title mt-3 text-slate-950">{section?.title ?? "CubixAI Workspace"}</h2>
                <p className="page-copy mt-3 text-sm md:text-base">{section?.copy ?? "Review your latest product monitoring signals and take action."}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/analysis/new">
                  <Button>Run Fresh Analysis</Button>
                </Link>
              </div>
            </div>
          </section>

          <section>{children}</section>
        </main>
      </div>
    </div>
  );
}
