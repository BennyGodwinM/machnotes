import { requireAdminPage } from "@/lib/auth/require-admin";
import { AppShell } from "@/components/AppShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <AppShell>{children}</AppShell>;
}
