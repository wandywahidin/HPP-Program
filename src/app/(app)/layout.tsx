import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AppNav, MobileNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Calculator, LogOut } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar — layar besar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col justify-between border-r border-neutral-200 bg-white p-3 lg:flex dark:border-neutral-800 dark:bg-neutral-900">
        <AppNav />
        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <div className="px-3 text-sm">
            <p className="font-medium">{session.user.name ?? "Pengguna"}</p>
            <p className="truncate text-xs text-neutral-500">{session.user.email}</p>
          </div>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 px-3 text-neutral-600 dark:text-neutral-300"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </form>
        </div>
      </aside>

      {/* Header + nav horizontal — layar kecil */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white lg:hidden dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
              <Calculator className="h-4 w-4" />
            </div>
            <span className="font-semibold">HPP Program</span>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="icon" className="h-8 w-8" title="Keluar">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Keluar</span>
            </Button>
          </form>
        </div>
        <MobileNav />
      </div>

      <main className="flex-1 p-4 lg:ml-60 lg:p-8">{children}</main>
    </div>
  );
}
