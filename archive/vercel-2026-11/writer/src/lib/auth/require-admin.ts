import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

// Neon Auth's hosted sign-up endpoint exists outside this app's own route
// protection, so "signed in" alone isn't "is our one admin." Every
// protected page/action re-checks the session email against ADMIN_EMAIL.
export async function requireAdminPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
    redirect("/sign-in");
  }
  return session.user;
}

export async function requireAdminApi() {
  const { data: session } = await auth.getSession();
  if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
    return null;
  }
  return session.user;
}
