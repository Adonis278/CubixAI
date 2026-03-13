"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CubixLogo } from "@/components/ui/cubix-logo";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/utils";

function sanitizeNextPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }

  return path;
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "That email already has an account. Sign in instead.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Incorrect email or password.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/network-request-failed":
        return "Network error while contacting Firebase. Try again.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in is disabled in Firebase Authentication.";
      default:
        return error.message || "Authentication failed. Check your credentials and try again.";
    }
  }

  const message = getErrorMessage(error, "Authentication failed. Check your credentials and try again.");
  if (message === "Firebase config missing") {
    return "Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values.";
  }

  return message;
}

function LoginCardSkeleton() {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-lg p-8">
        <CubixLogo />
        <h1 className="mt-5 text-3xl font-bold text-slate-950">Loading sign-in</h1>
        <p className="mt-2 text-sm text-slate-600">Preparing your monitoring workspace.</p>
      </Card>
    </div>
  );
}

function LoginPageContent() {
  const { user, signIn, signUp, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextPath = sanitizeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath);
    }
  }, [loading, user, router, nextPath]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      setBusy(true);
      const normalizedEmail = email.trim();

      if (mode === "signin") {
        await signIn(normalizedEmail, password);
      } else {
        await signUp(normalizedEmail, password);
      }
      router.replace(nextPath);
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen px-4 py-6 lg:place-items-center">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="page-hero flex min-h-[640px] flex-col justify-between px-6 py-7 md:px-8 md:py-8">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Assistant visibility</Badge>
              <Badge tone="neutral">Trust analytics</Badge>
            </div>
            <div className="mt-5">
              <CubixLogo />
            </div>
            <h1 className="page-title mt-5 max-w-xl text-slate-950">See how AI assistants position your products before customers do.</h1>
            <p className="page-copy mt-4 text-sm md:text-base">
              Monitor share of shelf, identify weak sources, and catch factual drift across assistant-style shopping journeys.
            </p>
          </div>

          <div className="relative z-10 grid gap-4 md:grid-cols-3">
            <div className="metric-card">
              <div className="flex items-center justify-between">
                <p className="metric-label">Visibility</p>
                <Sparkles className="h-4 w-4 text-orange-500" />
              </div>
              <p className="metric-value">21</p>
              <p className="metric-note">Queries per monitoring run</p>
            </div>
            <div className="metric-card">
              <div className="flex items-center justify-between">
                <p className="metric-label">Sources</p>
                <Globe2 className="h-4 w-4 text-orange-500" />
              </div>
              <p className="metric-value">HTTPS</p>
              <p className="metric-note">Retained evidence and domain quality tracking</p>
            </div>
            <div className="metric-card">
              <div className="flex items-center justify-between">
                <p className="metric-label">Trust</p>
                <ShieldCheck className="h-4 w-4 text-orange-500" />
              </div>
              <p className="metric-value">Human</p>
              <p className="metric-note">Review queue for claims that need verification</p>
            </div>
          </div>
        </section>

        <Card className="w-full p-8 md:p-10">
          <CubixLogo compact />
          <p className="eyebrow mt-5">{mode === "signin" ? "Welcome Back" : "Create Workspace"}</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950">{mode === "signin" ? "Sign in to continue" : "Set up your account"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {mode === "signin"
              ? "Access your AI visibility analytics dashboard, saved runs, and trust reviews."
              : "Create an account to start tracking product visibility, source quality, and AI-generated claims."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Email
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="team@brand.com" />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Password
              <Input
                type="password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
            ) : null}

            <Button className="w-full" disabled={busy}>
              {busy ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="text-sm font-semibold text-slate-600 hover:text-orange-600"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
            <Badge tone="neutral">Firebase auth</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginCardSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}
