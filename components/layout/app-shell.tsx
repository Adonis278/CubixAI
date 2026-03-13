"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, History, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/analysis/new", label: "New Analysis", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#fff1e6_0%,_#f8fafc_40%,_#f8fafc_100%)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
          <div className="mb-6 border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Cubix.AI</p>
            <h1 className="mt-1 text-lg font-bold text-slate-900">AI Commerce Monitor</h1>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="truncate text-sm font-semibold text-slate-800">{user?.email}</p>
            <button
              type="button"
              onClick={signOutUser}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
