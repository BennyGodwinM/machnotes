import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Site metadata shown on the public MachNotes site.
        </p>
      </div>

      <SettingsForm initial={{ siteTitle: settings.siteTitle, siteDescription: settings.siteDescription }} />

      <div className="max-w-md space-y-2 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Account</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Changing your password sends a reset link to the account email.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Reset password
        </Link>
      </div>
    </div>
  );
}
