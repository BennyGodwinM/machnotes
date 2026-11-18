"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { PasswordInput } from "@/components/auth/PasswordInput";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: resetError } = await authClient.resetPassword({ newPassword, token });
      if (resetError) {
        setError("That reset link is invalid or has expired.");
        return;
      }
      router.replace("/sign-in");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <p className="text-center text-sm text-red-600 dark:text-red-400">
        Missing or invalid reset link. Request a new one from the sign-in page.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          New password
        </label>
        <PasswordInput
          id="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {submitting ? "Saving..." : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Set a new password
          </h1>
        </div>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
