"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import cubixLogo from "@/cubixai_logo.png";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/utils";

function LoginBrandLogo({ className = "max-w-[240px]" }: { className?: string }) {
  return <Image src={cubixLogo} alt="CubixAI" className={`mx-auto h-auto w-full ${className}`} priority />;
}

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
      <Card className="w-full max-w-lg p-8 text-center">
        <LoginBrandLogo className="max-w-[260px]" />
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
  const requestedMode = searchParams.get("mode");

  const [mode, setMode] = useState<"signin" | "signup">(requestedMode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState<string>(sanitizeNextPath(searchParams.get("next")));

  const nextPath = sanitizeNextPath(searchParams.get("next"));

  useEffect(() => {
    setMode(requestedMode === "signup" ? "signup" : "signin");
  }, [requestedMode]);

  useEffect(() => {
    setDestination(nextPath);
  }, [nextPath]);

  useEffect(() => {
    if (!loading && user) {
      router.replace(destination);
    }
  }, [destination, loading, user, router]);

  function updateMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
  }

  function chooseDestination(nextDestination: string) {
    setDestination(nextDestination);
  }

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
      router.replace(destination);
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-end gap-3">
          <Button variant={mode === "signin" ? "primary" : "secondary"} onClick={() => updateMode("signin")}>
            Login
          </Button>
          <Button variant={mode === "signup" ? "primary" : "secondary"} onClick={() => updateMode("signup")}>
            Sign Up
          </Button>
        </header>

        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="page-hero flex min-h-[680px] flex-col justify-between px-6 py-7 md:px-8 md:py-8">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Assistant visibility</Badge>
              <Badge tone="neutral">Trust analytics</Badge>
              <Badge tone="neutral">AI discovery equity</Badge>
            </div>
            <div className="mt-8 text-center">
              <LoginBrandLogo className="max-w-[340px]" />
            </div>
            <h1 className="page-title mt-6 max-w-3xl text-slate-950">See how AI assistants position your products before customers do.</h1>
            <p className="page-copy mt-4 max-w-2xl text-sm md:text-base">
              Monitor share of shelf, identify weak sources, and catch factual drift across assistant-style shopping journeys.
            </p>

            <div className="mt-6 max-w-2xl rounded-[28px] border border-orange-200/60 bg-white/58 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">About CubixAI</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                CubixAI helps businesses, especially minority-owned small businesses, understand how they are discovered, described, and trusted across AI-driven buying journeys. The platform exists to make AI discovery more transparent, more accurate, and more fair.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => { updateMode("signin"); chooseDestination("/dashboard"); }}>
                Login To Dashboard
              </Button>
              <Button variant="secondary" onClick={() => { updateMode("signup"); chooseDestination("/analysis/new"); }}>
                Sign Up To Run Analysis
              </Button>
            </div>
          </div>
          </section>

          <Card className="w-full p-8 md:p-10 text-center">
            <LoginBrandLogo className="max-w-[220px]" />
            <p className="eyebrow mt-5">{mode === "signin" ? "Welcome Back" : "Create Workspace"}</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">{mode === "signin" ? "Sign in to continue" : "Set up your account"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {mode === "signin"
                ? "Access your AI visibility analytics dashboard, saved runs, and trust reviews."
                : "Create an account to start tracking product visibility, source quality, and AI-generated claims."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseDestination("/dashboard")}
                className={`rounded-2xl border px-4 py-4 text-left ${destination === "/dashboard" ? "border-orange-300 bg-orange-50/80" : "border-slate-200 bg-slate-50/70"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">After Auth</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Go to Dashboard</p>
                <p className="mt-1 text-sm text-slate-600">Review saved reports and current monitoring performance.</p>
              </button>
              <button
                type="button"
                onClick={() => chooseDestination("/analysis/new")}
                className={`rounded-2xl border px-4 py-4 text-left ${destination === "/analysis/new" ? "border-orange-300 bg-orange-50/80" : "border-slate-200 bg-slate-50/70"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">After Auth</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Run Analysis</p>
                <p className="mt-1 text-sm text-slate-600">Go straight into a new monitoring run after signing in.</p>
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-5 text-left">
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
                <span className="inline-flex items-center gap-2">
                  {busy ? "Please wait..." : mode === "signin" ? "Continue" : "Create Account"}
                  {!busy ? <ArrowRight className="h-4 w-4" /> : null}
                </span>
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
