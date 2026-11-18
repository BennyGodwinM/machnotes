"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("idle");

    try {
      const resolveRes = await fetch("/api/resolve-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (resolveRes.ok) {
        const { email } = await resolveRes.json();
        await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
      }
      // Same success state whether or not the username was wrong, so this
      // can't be used to probe for valid usernames.
      setStatus("sent");
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
            Reset password
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            We&apos;ll email a reset link to the account&apos;s address
          </p>
        </div>

        {status === "sent" ? (
          <p className="text-center text-sm text-neutral-700 dark:text-neutral-300">
            If that username has an account, a reset link is on its way.
          </p>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
          </div>
        )}

        {status !== "sent" && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        )}

        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/sign-in" className="underline hover:text-neutral-700 dark:hover:text-neutral-300">
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
