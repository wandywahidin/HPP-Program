import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col justify-between border-r border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <AppNav />
        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <div className="px-3 text-sm">
            <p className="font-medium">{session.user.name ?? "Pengguna"}</p>
            <p className="truncate text-xs text-neutral-500">{session.user.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-3 px-3 text-neutral-600 dark:text-neutral-300">
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </form>
        </div>
      </aside>
      <main className="ml-60 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
