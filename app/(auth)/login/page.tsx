"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextPath = "/dashboard";

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
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.replace(nextPath);
    } catch {
      setError("Authentication failed. Check your credentials and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(140deg,_#fff7ed_0%,_#ffffff_35%,_#f8fafc_100%)] p-4">
      <Card className="w-full max-w-md p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Cubix.AI</p>
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
