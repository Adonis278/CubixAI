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
      <div className="min-h-screen grid place-items-center text-slate-600">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">Loading your workspace...</div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
