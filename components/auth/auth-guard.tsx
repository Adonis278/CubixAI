"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-slate-600">
        <div className="page-hero max-w-md px-8 py-8 text-center">
          <p className="eyebrow justify-center">Cubix.AI</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-950">Loading your workspace</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Preparing your dashboard, saved runs, and monitoring controls.</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
