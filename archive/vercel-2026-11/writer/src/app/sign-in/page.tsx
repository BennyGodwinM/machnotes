"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { PasswordInput } from "@/components/auth/PasswordInput";

export default function SignInPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const resolveRes = await fetch("/api/resolve-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!resolveRes.ok) {
        setError("Invalid username or password.");
        return;
      }

      const { email } = await resolveRes.json();
      const { error: signInError } = await authClient.signIn.email({ email, password });

      if (signInError) {
        setError("Invalid username or password.");
        return;
      }
      router.replace("/");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            MachNotes Writer
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Sign in to manage articles
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              tabIndex={1}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Password
            </label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              tabIndex={2}
              value={password}
              onChange={setPassword}
              required
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          tabIndex={3}
          className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/forgot-password" className="underline hover:text-neutral-700 dark:hover:text-neutral-300">
            Forgot password?
          </Link>
        </p>
      </form>
    </main>
  );
}
