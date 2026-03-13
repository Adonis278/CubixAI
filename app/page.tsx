"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import cubixLogo from "@/cubixai_logo.png";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-end gap-3">
          <Link href="/login?mode=signin">
            <Button variant="secondary">Login</Button>
          </Link>
          <Link href="/login?mode=signup">
            <Button>Sign Up</Button>
          </Link>
        </header>

        <section className="page-hero relative overflow-hidden px-6 py-8 md:px-10 md:py-10">
          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
            <Image src={cubixLogo} alt="CubixAI" className="h-auto w-full max-w-[360px]" priority />

            <h1 className="page-title mt-8 max-w-4xl text-slate-950">
              See how AI assistants position your products before customers do.
            </h1>
            <p className="page-copy mt-5 max-w-3xl text-sm md:text-base">
              Monitor share of shelf, identify weak sources, and catch factual drift across assistant-style shopping journeys.
            </p>

            <div className="mt-10 grid w-full gap-4 md:grid-cols-3">
              <div className="metric-card text-left">
                <div className="flex items-center justify-between">
                  <p className="metric-label">Visibility</p>
                  <Sparkles className="h-4 w-4 text-orange-500" />
                </div>
                <p className="metric-value">21</p>
                <p className="metric-note">Queries per monitoring run</p>
              </div>

              <div className="metric-card text-left">
                <div className="flex items-center justify-between">
                  <p className="metric-label">Sources</p>
                  <Globe2 className="h-4 w-4 text-orange-500" />
                </div>
                <p className="metric-value">HTTPS</p>
                <p className="metric-note">Retained evidence and domain quality tracking</p>
              </div>

              <div className="metric-card text-left">
                <div className="flex items-center justify-between">
                  <p className="metric-label">Trust</p>
                  <ShieldCheck className="h-4 w-4 text-orange-500" />
                </div>
                <p className="metric-value">Human</p>
                <p className="metric-note">Review queue for claims that need verification</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <Badge tone="neutral">Assistant visibility</Badge>
              <Badge tone="neutral">Trust analytics</Badge>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
