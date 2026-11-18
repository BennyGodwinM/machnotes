"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();

  async function onClick() {
    await authClient.signOut();
    router.replace("/sign-in");
  }

  return (
    <button
      onClick={onClick}
      className="rounded-md px-3 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
    >
      Sign out
    </button>
  );
}
