"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(140deg,_#fff7ed_0%,_#ffffff_35%,_#f8fafc_100%)] p-4">
      <Card className="w-full max-w-md p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">CubixAi</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Loading sign-in...</p>
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
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(140deg,_#fff7ed_0%,_#ffffff_35%,_#f8fafc_100%)] p-4">
      <Card className="w-full max-w-md p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">CubixAi</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to access your AI visibility analytics dashboard.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Email
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Password
            <Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <Button className="w-full" disabled={busy}>
            {busy ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm font-semibold text-slate-600 hover:text-orange-600"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </Card>
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
