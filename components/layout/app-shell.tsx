"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BarChart3, History, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/auth-provider";
import cubixLogo from "@/cubixai_logo.png";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/analysis/new", label: "New Analysis", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-6 px-4 py-5 xl:grid-cols-[292px_minmax(0,1fr)] xl:px-6">
        <aside className="glass-panel flex flex-col rounded-[30px] border border-white/60 p-4 shadow-[var(--shadow-lg)]">
          <div className="overflow-hidden rounded-[26px] border border-orange-200/60 bg-[linear-gradient(145deg,_rgba(255,244,230,0.96)_0%,_rgba(255,255,255,0.88)_52%,_rgba(255,234,216,0.96)_100%)] p-5 text-center">
            <Image src={cubixLogo} alt="CubixAI" className="mx-auto h-auto w-full max-w-[180px]" priority />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Mission & Vision</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Help small businesses, especially minority-owned, earn fair visibility and accurate representation in AI-driven discovery.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge tone="neutral">Fair AI discovery</Badge>
              <Badge tone="neutral">Visibility intelligence</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              CubixAI is building a more transparent and equitable AI search ecosystem.
            </p>
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
                <p className="mt-2 text-sm font-semibold text-white">Authentic Product Reviews</p>
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

        <main>
          <section>{children}</section>
        </main>
      </div>
    </div>
  );
}
